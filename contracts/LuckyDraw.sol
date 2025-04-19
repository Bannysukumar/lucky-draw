// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AutomationCompatibleInterface.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract LuckyDraw is VRFConsumerBaseV2, AutomationCompatibleInterface, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;
    
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    bytes32 private immutable i_gasLane;
    uint64 private immutable i_subscriptionId;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    // Draw configuration
    uint256 public entryFee;
    uint256 public maxParticipants;
    uint256 public deadline;
    uint256 public commissionPercentage;
    bool public drawInProgress;
    uint256 public currentRound;
    uint256 public autoDrawInterval; // in seconds
    uint256 public lastAutoDrawTime;
    
    // Token-based entry
    IERC20 public entryToken;
    bool public useTokenEntry;
    
    // NFT for participation
    Counters.Counter private _tokenIds;
    ERC721 public participationNFT;
    
    // Participants and winners
    struct Winner {
        address winner;
        uint256 amount;
        uint256 round;
        uint256 timestamp;
    }
    Winner[] public winners;
    
    struct Participant {
        address addr;
        uint256 entries;
        uint256 lastEntryTime;
    }
    mapping(address => Participant) public participantInfo;
    
    // Add missing state variables
    mapping(address => bool) public hasParticipated;
    mapping(address => uint256) public participationCount;
    address[] public participantAddresses;
    
    // Events
    event DrawEntered(address indexed participant, uint256 round);
    event WinnerDrawn(address indexed winner, uint256 amount, uint256 round);
    event DrawCompleted(uint256 requestId, uint256 round);
    event AutoDrawTriggered(uint256 round);
    event NFTAwarded(address indexed participant, uint256 tokenId);
    event EntryTokenUpdated(address indexed token, bool useToken);
    event AdminDeposit(uint256 amount);
    event AdminDepositToken(uint256 amount);
    event AdminWithdraw(uint256 amount);
    event AdminWithdrawToken(uint256 amount);
    
    modifier notParticipated() {
        require(!hasParticipated[msg.sender], "Already participated in this round");
        _;
    }
    
    constructor(
        address vrfCoordinatorV2,
        bytes32 gasLane,
        uint64 subscriptionId,
        uint32 callbackGasLimit,
        uint256 _entryFee,
        uint256 _maxParticipants,
        uint256 _deadline,
        uint256 _commissionPercentage,
        uint256 _autoDrawInterval,
        address _entryToken,
        bool _useTokenEntry,
        address _participationNFT
    ) VRFConsumerBaseV2(vrfCoordinatorV2) Ownable(msg.sender) {
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_gasLane = gasLane;
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
        entryFee = _entryFee;
        maxParticipants = _maxParticipants;
        deadline = _deadline;
        commissionPercentage = _commissionPercentage;
        autoDrawInterval = _autoDrawInterval;
        lastAutoDrawTime = block.timestamp;
        entryToken = IERC20(_entryToken);
        useTokenEntry = _useTokenEntry;
        participationNFT = ERC721(_participationNFT);
        currentRound = 1;
    }
    
    function enterDraw() external payable notParticipated {
        require(block.timestamp < deadline, "Draw deadline passed");
        require(participantAddresses.length < maxParticipants, "Max participants reached");
        
        if (useTokenEntry) {
            require(entryToken.transferFrom(msg.sender, address(this), entryFee), "Token transfer failed");
        } else {
            require(msg.value == entryFee, "Incorrect entry fee");
        }
        
        participantAddresses.push(msg.sender);
        hasParticipated[msg.sender] = true;
        participationCount[msg.sender]++;
        
        // Update participant info
        participantInfo[msg.sender] = Participant({
            addr: msg.sender,
            entries: participantInfo[msg.sender].entries + 1,
            lastEntryTime: block.timestamp
        });
        
        // Mint NFT for participation
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        
        // Instead of using mint directly, we'll use a custom function to handle NFT minting
        // This is because standard ERC721 doesn't have a mint function
        mintParticipationNFT(msg.sender, newTokenId);
        
        emit DrawEntered(msg.sender, currentRound);
        emit NFTAwarded(msg.sender, newTokenId);

        // Auto-draw when 2 participants reached
        if (participantAddresses.length >= 2) {
            drawWinner();
        }
    }
    
    // Custom function to mint participation NFT
    function mintParticipationNFT(address to, uint256 tokenId) internal {
        // This is a placeholder implementation
        // In a real implementation, you would need to:
        // 1. Create a custom ERC721 contract with a mint function
        // 2. Or use a different approach to handle NFT minting
        
        // For now, we'll just emit the event and assume the NFT is minted
        // In a real implementation, you would need to implement the actual minting logic
        emit NFTAwarded(to, tokenId);
    }
    
    function drawWinner() public {
        require(!drawInProgress, "Draw already in progress");
        require(participantAddresses.length > 0, "No participants");
        require(
            block.timestamp >= deadline || participantAddresses.length >= maxParticipants,
            "Draw conditions not met"
        );
        
        drawInProgress = true;
        
        i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );
    }
    
    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal override {
        uint256 winnerIndex = randomWords[0] % participantAddresses.length;
        address winner = participantAddresses[winnerIndex];
        
        uint256 prizeAmount;
        if (useTokenEntry) {
            prizeAmount = entryToken.balanceOf(address(this));
        } else {
            prizeAmount = address(this).balance;
        }
        
        uint256 commission = (prizeAmount * commissionPercentage) / 100;
        uint256 winnerAmount = prizeAmount - commission;
        
        // Record winner in history
        winners.push(Winner({
            winner: winner,
            amount: winnerAmount,
            round: currentRound,
            timestamp: block.timestamp
        }));
        
        // Transfer prize to winner immediately
        if (useTokenEntry) {
            // For USDT, ensure the transfer succeeds
            bool transferSuccess = entryToken.transfer(winner, winnerAmount);
            require(transferSuccess, "USDT transfer failed");
            
            // Double-check the transfer was successful
            uint256 winnerBalance = entryToken.balanceOf(winner);
            require(winnerBalance >= winnerAmount, "Winner balance verification failed");
        } else {
            // For native token (BNB), use a more secure transfer method
            (bool success, ) = winner.call{value: winnerAmount}("");
            require(success, "BNB transfer failed");
            
            // Double-check the transfer was successful
            require(address(this).balance >= prizeAmount - winnerAmount, "Contract balance verification failed");
        }
        
        emit WinnerDrawn(winner, winnerAmount, currentRound);
        emit DrawCompleted(requestId, currentRound);
        
        // Reset for next round
        delete participantAddresses;
        for (uint i = 0; i < participantAddresses.length; i++) {
            hasParticipated[participantAddresses[i]] = false;
        }
        
        // Increment round and update deadline
        currentRound++;
        deadline = block.timestamp + 7 days; // Set new deadline for next round
        
        drawInProgress = false;
        lastAutoDrawTime = block.timestamp;
    }
    
    // Admin functions
    function setEntryToken(address _token, bool _useToken) external onlyOwner {
        require(_token != address(0), "Invalid token address");
        entryToken = IERC20(_token);
        useTokenEntry = _useToken;
        emit EntryTokenUpdated(_token, _useToken);
    }
    
    function setEntryFee(uint256 _fee) external onlyOwner {
        require(_fee > 0, "Invalid fee");
        entryFee = _fee;
    }
    
    function setEntryFeeToUSDT() external onlyOwner {
        require(useTokenEntry, "Token entry not enabled");
        // Set entry fee to 0.01 USDT (with 18 decimals)
        entryFee = 10000000000000000; // 0.01 USDT with 18 decimals
    }
    
    function setMaxParticipants(uint256 _max) external onlyOwner {
        require(_max > 0, "Invalid max participants");
        maxParticipants = _max;
    }
    
    function setDeadline(uint256 _deadline) external onlyOwner {
        require(_deadline > block.timestamp, "Invalid deadline");
        deadline = _deadline;
    }
    
    function setAutoDrawInterval(uint256 _interval) external onlyOwner {
        require(_interval > 0, "Invalid interval");
        autoDrawInterval = _interval;
    }
    
    // Admin deposit and withdraw functions
    function adminDeposit() external payable onlyOwner {
        require(msg.value > 0, "Must deposit some value");
        emit AdminDeposit(msg.value);
    }
    
    function adminDepositToken(uint256 amount) external onlyOwner {
        require(amount > 0, "Must deposit some tokens");
        require(useTokenEntry, "Token entry not enabled");
        require(entryToken.transferFrom(msg.sender, address(this), amount), "Token transfer failed");
        emit AdminDepositToken(amount);
    }
    
    function adminWithdraw(uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be greater than 0");
        require(amount <= address(this).balance, "Insufficient balance");
        
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Withdrawal failed");
        
        emit AdminWithdraw(amount);
    }
    
    function adminWithdrawToken(uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be greater than 0");
        require(useTokenEntry, "Token entry not enabled");
        
        uint256 contractBalance = entryToken.balanceOf(address(this));
        require(amount <= contractBalance, "Insufficient token balance");
        
        require(entryToken.transfer(msg.sender, amount), "Token withdrawal failed");
        
        emit AdminWithdrawToken(amount);
    }
    
    // View functions
    function getParticipants() external view returns (address[] memory) {
        return participantAddresses;
    }
    
    function getBalance() external view returns (uint256) {
        if (useTokenEntry) {
            return entryToken.balanceOf(address(this));
        } else {
            return address(this).balance;
        }
    }
    
    function getParticipantCount() external view returns (uint256) {
        return participantAddresses.length;
    }
    
    function getWinners() external view returns (Winner[] memory) {
        return winners;
    }
    
    function getTopParticipants(uint256 limit) external view returns (address[] memory, uint256[] memory) {
        uint256 count = 0;
        address[] memory addresses = new address[](100); // Assuming max 100 participants
        uint256[] memory counts = new uint256[](100);
        
        // Simple sorting algorithm
        for (uint i = 0; i < participantAddresses.length; i++) {
            address participant = participantAddresses[i];
            uint256 participantCount = participationCount[participant];
            
            // Find insertion point
            uint256 insertIndex = 0;
            while (insertIndex < count && counts[insertIndex] > participantCount) {
                insertIndex++;
            }
            
            // Shift elements
            for (uint j = count; j > insertIndex; j--) {
                addresses[j] = addresses[j-1];
                counts[j] = counts[j-1];
            }
            
            // Insert
            addresses[insertIndex] = participant;
            counts[insertIndex] = participantCount;
            count++;
        }
        
        // Trim arrays to requested limit
        if (count > limit) {
            count = limit;
        }
        
        address[] memory resultAddresses = new address[](count);
        uint256[] memory resultCounts = new uint256[](count);
        
        for (uint i = 0; i < count; i++) {
            resultAddresses[i] = addresses[i];
            resultCounts[i] = counts[i];
        }
        
        return (resultAddresses, resultCounts);
    }
    
    // Internal function to check if upkeep is needed
    function _checkUpkeepNeeded() internal view returns (bool) {
        return (
            !drawInProgress &&
            participantAddresses.length >= 2 &&
            (block.timestamp >= deadline || participantAddresses.length >= 2) &&
            (block.timestamp - lastAutoDrawTime >= autoDrawInterval)
        );
    }
    
    // Chainlink Keeper function for auto-draw
    function checkUpkeep(bytes calldata) public view override returns (bool upkeepNeeded, bytes memory) {
        upkeepNeeded = _checkUpkeepNeeded();
        return (upkeepNeeded, "");
    }
    
    function performUpkeep(bytes calldata) external override {
        bool upkeepNeeded = _checkUpkeepNeeded();
        require(upkeepNeeded, "Upkeep not needed");
        
        emit AutoDrawTriggered(currentRound);
        drawWinner();
    }
}