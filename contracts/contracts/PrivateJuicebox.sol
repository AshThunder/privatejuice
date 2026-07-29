// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {
    Nox,
    euint256,
    externalEuint256
} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";

/// @notice Minimal Juicebox payment terminal surface used for settlement.
interface IJBPaymentTerminal {
    function pay(
        uint256 projectId,
        uint256 amount,
        address token,
        address beneficiary,
        uint256 minReturnedTokens,
        bool preferClaimedTokens,
        string calldata memo,
        bytes calldata metadata
    ) external payable returns (uint256 beneficiaryTokenCount);
}

/// @notice Juicebox V3 token store — move unclaimed project credits.
interface IJBTokenStore {
    function transferFrom(
        address holder,
        uint256 projectId,
        address recipient,
        uint256 amount
    ) external;

    function unclaimedBalanceOf(
        address holder,
        uint256 projectId
    ) external view returns (uint256);
}

/**
 * @title PrivateJuicebox
 * @notice Confidential crowdfunding layer for Juicebox projects using iExec Nox.
 *
 * Flow:
 * 1. `fund()` — deposit ETH; credited as an encrypted personal balance.
 * 2. `pledge()` — move an encrypted amount into a project pot + per-user share.
 * 3. `openSettlement()` — make the aggregate pot publicly decryptable.
 * 4. `settleToJuicebox()` — pay aggregate into Juicebox with this contract as
 *    beneficiary (holds Juicebox credits for the round).
 * 5. `prepareClaim()` / `claimTokens()` — each pledger claims a proportional
 *    credit share via Nox (encrypted contrib × tokens / total ETH).
 *
 * @dev Claiming makes the caller's token-share handle publicly decryptable, so
 *      pledge size can be inferred from public totals after claim. Amounts stay
 *      private until a user chooses to claim.
 */
contract PrivateJuicebox {
    address public constant JB_ETH = 0x000000000000000000000000000000000000EEEe;

    IJBPaymentTerminal public immutable juiceTerminal;
    IJBTokenStore public immutable juiceTokenStore;
    address public owner;

    mapping(address => euint256) private _balances;
    mapping(uint256 => euint256) private _projectPledges;
    /// @dev Encrypted ETH pledged by each account into a project.
    mapping(uint256 => mapping(address => euint256)) private _contributions;
    /// @dev Encrypted JB credit share prepared for claim (contrib × tokens / eth).
    mapping(uint256 => mapping(address => euint256)) private _claimShares;

    mapping(uint256 => bool) public settlementOpen;
    mapping(uint256 => bool) public settled;
    mapping(uint256 => uint256) public settledAmount;
    mapping(uint256 => uint256) public settledTokenCount;
    mapping(uint256 => uint256) public pledgeCount;
    mapping(uint256 => mapping(address => bool)) public claimed;

    event Funded(address indexed account, uint256 ethAmount);
    event Pledged(address indexed account, uint256 indexed projectId);
    event SettlementOpened(uint256 indexed projectId, bytes32 pledgeHandle);
    event SettledToJuicebox(
        uint256 indexed projectId,
        uint256 amount,
        address beneficiary,
        uint256 jbTokenCount
    );
    event ClaimPrepared(
        uint256 indexed projectId,
        address indexed account,
        bytes32 shareHandle
    );
    event TokensClaimed(
        uint256 indexed projectId,
        address indexed account,
        uint256 tokenCount
    );

    error ZeroValue();
    error AlreadySettled();
    error SettlementNotOpen();
    error InsufficientEscrow();
    error NotOwner();
    error EmptyPledgePot();
    error ProjectAlreadySettled();
    error NotSettled();
    error AlreadyClaimed();
    error NoContribution();
    error ClaimNotPrepared();
    error ZeroClaim();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address juiceTerminal_, address juiceTokenStore_) {
        juiceTerminal = IJBPaymentTerminal(juiceTerminal_);
        juiceTokenStore = IJBTokenStore(juiceTokenStore_);
        owner = msg.sender;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }

    /// @notice Deposit ETH into a confidential personal balance.
    function fund() external payable {
        if (msg.value == 0) revert ZeroValue();

        euint256 credit = Nox.toEuint256(msg.value);
        euint256 newBalance = Nox.add(_balances[msg.sender], credit);

        Nox.allowThis(newBalance);
        Nox.allow(newBalance, msg.sender);
        Nox.addViewer(newBalance, msg.sender);

        _balances[msg.sender] = newBalance;
        emit Funded(msg.sender, msg.value);
    }

    /**
     * @notice Pledge an encrypted amount from your confidential balance to a
     *         Juicebox project id. Tracks your encrypted contribution for later
     *         proportional token claims.
     */
    function pledge(
        uint256 projectId,
        externalEuint256 encryptedAmount,
        bytes calldata inputProof
    ) external {
        if (settled[projectId]) revert ProjectAlreadySettled();

        euint256 amount = Nox.fromExternal(encryptedAmount, inputProof);

        euint256 newBalance = Nox.sub(_balances[msg.sender], amount);
        Nox.allowThis(newBalance);
        Nox.allow(newBalance, msg.sender);
        Nox.addViewer(newBalance, msg.sender);
        _balances[msg.sender] = newBalance;

        euint256 newPot = Nox.add(_projectPledges[projectId], amount);
        Nox.allowThis(newPot);
        Nox.allow(newPot, owner);
        Nox.addViewer(newPot, owner);
        if (settlementOpen[projectId]) {
            Nox.allowPublicDecryption(newPot);
        }
        _projectPledges[projectId] = newPot;

        euint256 newContrib = Nox.add(_contributions[projectId][msg.sender], amount);
        Nox.allowThis(newContrib);
        Nox.allow(newContrib, msg.sender);
        Nox.addViewer(newContrib, msg.sender);
        _contributions[projectId][msg.sender] = newContrib;

        unchecked {
            pledgeCount[projectId] += 1;
        }

        emit Pledged(msg.sender, projectId);
    }

    function balanceHandleOf(address account) external view returns (bytes32) {
        return euint256.unwrap(_balances[account]);
    }

    function projectPledgeHandle(uint256 projectId) external view returns (bytes32) {
        return euint256.unwrap(_projectPledges[projectId]);
    }

    function contributionHandleOf(
        uint256 projectId,
        address account
    ) external view returns (bytes32) {
        return euint256.unwrap(_contributions[projectId][account]);
    }

    function claimShareHandleOf(
        uint256 projectId,
        address account
    ) external view returns (bytes32) {
        return euint256.unwrap(_claimShares[projectId][account]);
    }

    function openSettlement(uint256 projectId) external {
        if (settled[projectId]) revert AlreadySettled();
        if (!Nox.isInitialized(_projectPledges[projectId])) revert EmptyPledgePot();
        if (settlementOpen[projectId]) return;

        Nox.allowPublicDecryption(_projectPledges[projectId]);
        settlementOpen[projectId] = true;

        emit SettlementOpened(projectId, euint256.unwrap(_projectPledges[projectId]));
    }

    /**
     * @notice Settle the publicly decrypted aggregate into Juicebox.
     * @dev Always uses this contract as the Juicebox beneficiary so credits can
     *      later be claimed proportionally by pledgers.
     */
    function settleToJuicebox(
        uint256 projectId,
        uint256 amount,
        string calldata memo
    ) external returns (uint256 jbTokenCount) {
        if (!settlementOpen[projectId]) revert SettlementNotOpen();
        if (settled[projectId]) revert AlreadySettled();
        if (amount == 0) revert ZeroValue();
        if (address(this).balance < amount) revert InsufficientEscrow();

        settled[projectId] = true;
        settledAmount[projectId] = amount;

        jbTokenCount = juiceTerminal.pay{value: amount}(
            projectId,
            amount,
            JB_ETH,
            address(this),
            0,
            false,
            memo,
            bytes("")
        );

        settledTokenCount[projectId] = jbTokenCount;

        emit SettledToJuicebox(projectId, amount, address(this), jbTokenCount);
    }

    /**
     * @notice Compute your encrypted JB credit share and make it publicly
     *         decryptable so you can finish `claimTokens` with a Nox proof.
     * @dev Reveals your share (and thus pledge size vs public totals) once called.
     */
    function prepareClaim(uint256 projectId) external returns (bytes32 shareHandle) {
        if (!settled[projectId]) revert NotSettled();
        if (claimed[projectId][msg.sender]) revert AlreadyClaimed();

        euint256 contrib = _contributions[projectId][msg.sender];
        if (!Nox.isInitialized(contrib)) revert NoContribution();

        uint256 ethTotal = settledAmount[projectId];
        uint256 tokenTotal = settledTokenCount[projectId];
        if (ethTotal == 0) revert ZeroValue();

        // share = contrib * settledTokens / settledEth
        euint256 share = Nox.div(
            Nox.mul(contrib, Nox.toEuint256(tokenTotal)),
            Nox.toEuint256(ethTotal)
        );

        Nox.allowThis(share);
        Nox.allow(share, msg.sender);
        Nox.addViewer(share, msg.sender);
        Nox.allowPublicDecryption(share);

        _claimShares[projectId][msg.sender] = share;
        shareHandle = euint256.unwrap(share);

        emit ClaimPrepared(projectId, msg.sender, shareHandle);
    }

    /**
     * @notice Finish claim: verify Nox public-decrypt proof of your share and
     *         transfer that many Juicebox unclaimed credits to you.
     */
    function claimTokens(
        uint256 projectId,
        bytes calldata decryptionProof
    ) external returns (uint256 tokenCount) {
        if (!settled[projectId]) revert NotSettled();
        if (claimed[projectId][msg.sender]) revert AlreadyClaimed();

        euint256 share = _claimShares[projectId][msg.sender];
        if (!Nox.isInitialized(share)) revert ClaimNotPrepared();

        tokenCount = Nox.publicDecrypt(share, decryptionProof);
        if (tokenCount == 0) revert ZeroClaim();

        claimed[projectId][msg.sender] = true;

        juiceTokenStore.transferFrom(
            address(this),
            projectId,
            msg.sender,
            tokenCount
        );

        emit TokensClaimed(projectId, msg.sender, tokenCount);
    }

    function escrowBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /// @notice Unclaimed Juicebox credits currently held by this contract.
    function heldCredits(uint256 projectId) external view returns (uint256) {
        return juiceTokenStore.unclaimedBalanceOf(address(this), projectId);
    }

    receive() external payable {}
}
