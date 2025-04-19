// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const connectWalletBtn = document.getElementById("connectWallet");
    const enterDrawBtn = document.getElementById("enterDraw");
    const drawWinnerBtn = document.getElementById("drawWinner");
    const entryFeeElement = document.getElementById("entryFee");
    const participantCountElement = document.getElementById("participantCount");
    const prizePoolElement = document.getElementById("prizePool");
    const currentRoundElement = document.getElementById("currentRound");
    const winnersListElement = document.getElementById("winnersList");
    const leaderboardListElement = document.getElementById("leaderboardList");
    const nftGalleryElement = document.getElementById("nftGallery");
    const toastElement = document.getElementById("toast");
    const networkStatusElement = document.getElementById("networkStatus");
    const userAddressElement = document.getElementById("userAddress");
    const connectionStatusElement = document.getElementById("connectionStatus");

    // Admin controls
    const adminControls = document.getElementById('adminControls');
    const depositAmount = document.getElementById('depositAmount');
    const withdrawAmount = document.getElementById('withdrawAmount');
    const depositTokenBtn = document.getElementById('depositToken');
    const withdrawTokenBtn = document.getElementById('withdrawToken');

    // Contract ABI and address will be filled after deployment
    const CONTRACT_ADDRESS = "YOUR_CONTRACT_ADDRESS";
    const USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955"; // BSC Testnet USDT
    const CONTRACT_ABI = [
        "function owner() view returns (address)",
        "function entryFee() view returns (uint256)",
        "function maxParticipants() view returns (uint256)",
        "function deadline() view returns (uint256)",
        "function commissionPercentage() view returns (uint256)",
        "function drawInProgress() view returns (bool)",
        "function currentRound() view returns (uint256)",
        "function autoDrawInterval() view returns (uint256)",
        "function lastAutoDrawTime() view returns (uint256)",
        "function entryToken() view returns (address)",
        "function useTokenEntry() view returns (bool)",
        "function participationNFT() view returns (address)",
        "function participants(uint256) view returns (address)",
        "function hasParticipated(address) view returns (bool)",
        "function participationCount(address) view returns (uint256)",
        "function enterDraw() payable",
        "function drawWinner()",
        "function getParticipants() view returns (address[])",
        "function getBalance() view returns (uint256)",
        "function getParticipantCount() view returns (uint256)",
        "function getWinners() view returns (tuple(address winner, uint256 amount, uint256 round, uint256 timestamp)[])",
        "function getTopParticipants(uint256) view returns (address[], uint256[])",
        "function withdrawCommission()",
        "function setEntryFee(uint256)",
        "function setMaxParticipants(uint256)",
        "function setDeadline(uint256)",
        "function setAutoDrawInterval(uint256)",
        "function setEntryToken(address, bool)",
        "function setEntryFeeToUSDT()",
        "function adminDeposit() payable",
        "function adminDepositToken(uint256)",
        "function adminWithdraw(uint256)",
        "function adminWithdrawToken(uint256)",
        "event DrawEntered(address indexed participant, uint256 round)",
        "event WinnerDrawn(address indexed winner, uint256 amount, uint256 round)",
        "event DrawCompleted(uint256 requestId, uint256 round)",
        "event AutoDrawTriggered(uint256 round)",
        "event NFTAwarded(address indexed participant, uint256 tokenId)",
        "event EntryTokenUpdated(address indexed token, bool useToken)",
        "event AdminDeposit(uint256 amount)",
        "event AdminDepositToken(uint256 amount)",
        "event AdminWithdraw(uint256 amount)",
        "event AdminWithdrawToken(uint256 amount)"
    ];

    let contract;
    let signer;
    let userAddress;
    let isAdmin = false;
    let entryTokenContract;
    let nftContract;

    // Show toast notification
    function showToast(message, type = "info") {
        const toast = new bootstrap.Toast(toastElement);
        document.getElementById('toastTitle').textContent = type.charAt(0).toUpperCase() + type.slice(1);
        document.getElementById('toastMessage').textContent = message;
        toast.show();
    }

    // Check if ethers is loaded
    if (typeof ethers === 'undefined') {
        console.error('ethers.js is not loaded. Please check your internet connection and try again.');
        showToast('Error: ethers.js library not loaded. Please refresh the page.', 'error');
    }

    // Initialize the application
    async function init() {
        if (typeof window.ethereum === "undefined") {
            showToast("Please install MetaMask!", "error");
            return;
        }

        if (typeof ethers === 'undefined') {
            showToast('Error: ethers.js library not loaded. Please refresh the page.', 'error');
            return;
        }

        try {
            // Request account access first
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            
            // Setup provider and signer after permission is granted
            const provider = new ethers.providers.Web3Provider(window.ethereum, {
                name: 'binance',
                chainId: 97 // BSC Testnet chain ID
            });
            
            // Switch to BSC Testnet if not already on it
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0x61' }], // BSC Testnet chain ID in hex
                });
                networkStatusElement.textContent = 'Connected to BSC Testnet';
                networkStatusElement.classList.remove('bg-secondary', 'error');
                networkStatusElement.classList.add('bg-success');
            } catch (switchError) {
                // If BSC Testnet is not added to MetaMask, add it
                if (switchError.code === 4902) {
                    try {
                        await window.ethereum.request({
                            method: 'wallet_addEthereumChain',
                            params: [{
                                chainId: '0x61',
                                chainName: 'BSC Testnet',
                                nativeCurrency: {
                                    name: 'BNB',
                                    symbol: 'tBNB',
                                    decimals: 18
                                },
                                rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545/'],
                                blockExplorerUrls: ['https://testnet.bscscan.com/']
                            }]
                        });
                    } catch (addError) {
                        console.error('Error adding BSC Testnet:', addError);
                        showToast('Error adding BSC Testnet network', 'error');
                        networkStatusElement.textContent = 'Network Error';
                        networkStatusElement.classList.add('error');
                        return;
                    }
                } else {
                    console.error('Error switching to BSC Testnet:', switchError);
                    showToast('Error switching to BSC Testnet network', 'error');
                    networkStatusElement.textContent = 'Network Error';
                    networkStatusElement.classList.add('error');
                    return;
                }
            }
            
            provider.getResolver = () => null; // Disable ENS
            signer = provider.getSigner();
            userAddress = await signer.getAddress();
            
            // Show connection status
            connectionStatusElement.style.display = 'block';
            userAddressElement.textContent = `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
            
            // Initialize contract
            contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
            
            // Check if user is admin
            const owner = await contract.owner();
            isAdmin = owner.toLowerCase() === userAddress.toLowerCase();
            
            // Show admin controls if user is admin
            if (isAdmin) {
                adminControls.style.display = 'block';
            }

            // Initialize USDT contract
            entryTokenContract = new ethers.Contract(
                USDT_ADDRESS,
                ["function approve(address, uint256) returns (bool)", 
                 "function allowance(address, address) view returns (uint256)",
                 "function symbol() view returns (string)"],
                signer
            );
            
            // Update UI
            await updateUI();
            setupEventListeners();
            
            connectWalletBtn.textContent = `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
            connectWalletBtn.disabled = true;
            
            showToast("Wallet connected successfully!", "success");
        } catch (error) {
            console.error("Error initializing:", error);
            showToast(error.message || "Error connecting wallet", "error");
            networkStatusElement.textContent = 'Connection Error';
            networkStatusElement.classList.add('error');
        }
    }

    // Update UI with contract data
    async function updateUI() {
        try {
            const entryFee = await contract.entryFee();
            const participantCount = await contract.getParticipantCount();
            const maxParticipants = await contract.maxParticipants();
            const balance = await contract.getBalance();
            const currentRound = await contract.currentRound();
            const useTokenEntry = await contract.useTokenEntry();
            
            // Update entry fee display
            if (useTokenEntry) {
                entryFeeElement.textContent = `${ethers.utils.formatUnits(entryFee, 18)} USDT`;
            } else {
                entryFeeElement.textContent = `${ethers.utils.formatEther(entryFee)} BNB`;
            }
            
            // Update other UI elements
            participantCountElement.textContent = `${participantCount}/${maxParticipants}`;
            // Always display prize pool in USDT
            prizePoolElement.textContent = `${ethers.utils.formatUnits(balance, 18)} USDT`;
            currentRoundElement.textContent = currentRound.toString();
            
            // Update winners list
            updateWinnersList();
            
            // Update leaderboard
            updateLeaderboard();
            
            // Update NFT gallery
            updateNFTGallery();
            
            // Enable/disable buttons based on conditions
            enterDrawBtn.disabled = false;
            if (isAdmin) {
                drawWinnerBtn.disabled = false;
            }
        } catch (error) {
            console.error("Error updating UI:", error);
            showToast("Error updating UI", "error");
        }
    }

    // Update winners list
    async function updateWinnersList() {
        try {
            const winners = await contract.getWinners();
            winnersListElement.innerHTML = '';
            
            if (winners.length === 0) {
                winnersListElement.innerHTML = '<p class="no-data">No winners yet</p>';
                return;
            }
            
            // Sort winners by round (newest first)
            winners.sort((a, b) => b.round - a.round);
            
            for (const winner of winners) {
                const winnerItem = document.createElement('div');
                winnerItem.className = 'winner-item';
                
                const date = new Date(winner.timestamp * 1000);
                const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
                
                winnerItem.innerHTML = `
                    <div class="winner-info">
                        <div class="winner-address">${winner.winner.slice(0, 6)}...${winner.winner.slice(-4)}</div>
                        <div class="winner-round">Round ${winner.round} • ${formattedDate}</div>
                    </div>
                    <div class="winner-amount">${ethers.utils.formatUnits(winner.amount, 18)} USDT</div>
                `;
                
                winnersListElement.appendChild(winnerItem);
            }
        } catch (error) {
            console.error("Error updating winners list:", error);
        }
    }

    // Update leaderboard
    async function updateLeaderboard() {
        try {
            const [addresses, counts] = await contract.getTopParticipants(10);
            leaderboardListElement.innerHTML = '';
            
            if (addresses.length === 0) {
                leaderboardListElement.innerHTML = '<p class="no-data">No participants yet</p>';
                return;
            }
            
            for (let i = 0; i < addresses.length; i++) {
                const leaderboardItem = document.createElement('div');
                leaderboardItem.className = 'leaderboard-item';
                
                leaderboardItem.innerHTML = `
                    <div class="leaderboard-rank">#${i + 1}</div>
                    <div class="leaderboard-address">${addresses[i].slice(0, 6)}...${addresses[i].slice(-4)}</div>
                    <div class="leaderboard-count">${counts[i]} entries</div>
                `;
                
                leaderboardListElement.appendChild(leaderboardItem);
            }
        } catch (error) {
            console.error("Error updating leaderboard:", error);
        }
    }

    // Update NFT gallery
    async function updateNFTGallery() {
        try {
            const balance = await nftContract.balanceOf(userAddress);
            nftGalleryElement.innerHTML = '';
            
            if (balance.toNumber() === 0) {
                nftGalleryElement.innerHTML = '<p class="no-data">You don\'t have any participation NFTs yet</p>';
                return;
            }
            
            for (let i = 0; i < balance.toNumber(); i++) {
                const tokenId = await nftContract.tokenOfOwnerByIndex(userAddress, i);
                const tokenURI = await nftContract.tokenURI(tokenId);
                
                // Fetch metadata from IPFS or other storage
                let imageUrl = 'https://via.placeholder.com/200x200?text=Lucky+Draw+NFT';
                let round = 'Unknown';
                
                try {
                    const response = await fetch(tokenURI);
                    const metadata = await response.json();
                    imageUrl = metadata.image;
                    round = metadata.attributes.find(attr => attr.trait_type === 'Round')?.value || 'Unknown';
                } catch (error) {
                    console.error("Error fetching NFT metadata:", error);
                }
                
                const nftCard = document.createElement('div');
                nftCard.className = 'nft-card';
                
                nftCard.innerHTML = `
                    <img src="${imageUrl}" alt="NFT #${tokenId}" class="nft-image">
                    <div class="nft-info">
                        <div class="nft-id">NFT #${tokenId}</div>
                        <div class="nft-round">Round ${round}</div>
                    </div>
                `;
                
                nftGalleryElement.appendChild(nftCard);
            }
        } catch (error) {
            console.error("Error updating NFT gallery:", error);
        }
    }

    // Get token symbol
    async function getTokenSymbol(tokenAddress) {
        try {
            const tokenContract = new ethers.Contract(
                tokenAddress,
                ["function symbol() view returns (string)"],
                signer
            );
            return await tokenContract.symbol();
        } catch (error) {
            console.error("Error getting token symbol:", error);
            return "TOKEN";
        }
    }

    // Setup event listeners
    function setupEventListeners() {
        enterDrawBtn.addEventListener("click", enterDraw);
        drawWinnerBtn.addEventListener("click", drawWinner);
        
        // Tab switching
        tabButtons.forEach(button => {
            button.addEventListener("click", () => {
                const tabName = button.getAttribute("data-tab");
                
                // Update active tab button
                tabButtons.forEach(btn => btn.classList.remove("active"));
                button.classList.add("active");
                
                // Update active tab pane
                tabPanes.forEach(pane => {
                    pane.classList.remove("active");
                    if (pane.id === `${tabName}-tab`) {
                        pane.classList.add("active");
                    }
                });
            });
        });
        
        // Listen for contract events
        contract.on("DrawEntered", (participant, round) => {
            showToast("New participant entered the draw!", "success");
            updateUI();
        });
        
        contract.on("WinnerDrawn", (winner, amount, round) => {
            showToast(`Winner drawn: ${winner.slice(0, 6)}...${winner.slice(-4)}`, "success");
            updateUI();
        });
        
        contract.on("NFTAwarded", (participant, tokenId) => {
            if (participant.toLowerCase() === userAddress.toLowerCase()) {
                showToast(`You received a participation NFT!`, "success");
                updateNFTGallery();
            }
        });
        
        contract.on("AutoDrawTriggered", (round) => {
            showToast(`Auto-draw triggered for round ${round}`, "info");
        });
    }

    // Enter the lucky draw
    async function enterDraw() {
        try {
            enterDrawBtn.disabled = true;
            const entryFee = await contract.entryFee();
            const useTokenEntry = await contract.useTokenEntry();
            
            if (useTokenEntry) {
                // Check allowance
                const tokenAddress = await contract.entryToken();
                const allowance = await entryTokenContract.allowance(userAddress, CONTRACT_ADDRESS);
                
                if (allowance.lt(entryFee)) {
                    // Approve token spending
                    const approveTx = await entryTokenContract.approve(CONTRACT_ADDRESS, entryFee);
                    await approveTx.wait();
                    showToast("Token approval successful", "success");
                }
            }
            
            // Enter the draw
            const tx = await contract.enterDraw({
                value: useTokenEntry ? 0 : entryFee
            });
            
            await tx.wait();
            showToast("Successfully entered the draw!", "success");

            // Check if we've reached 2 participants
            const participantCount = await contract.getParticipantCount();
            if (participantCount.toNumber() >= 2) {
                // Automatically trigger the draw
                const drawTx = await contract.drawWinner();
                await drawTx.wait();
                showToast("Drawing winner automatically...", "info");
            }
        } catch (error) {
            console.error("Error entering draw:", error);
            showToast(error.message || "Error entering draw", "error");
        } finally {
            enterDrawBtn.disabled = false;
        }
    }

    // Draw winner (admin only)
    async function drawWinner() {
        try {
            drawWinnerBtn.disabled = true;
            const tx = await contract.drawWinner();
            await tx.wait();
            showToast("Drawing winner...", "success");
        } catch (error) {
            console.error("Error drawing winner:", error);
            showToast(error.message || "Error drawing winner", "error");
        } finally {
            drawWinnerBtn.disabled = false;
        }
    }

    // Connect wallet button click handler
    connectWalletBtn.addEventListener("click", init);

    // Check if user is admin
    async function checkIfAdmin() {
        try {
            const adminAddress = await contract.admin();
            const isAdmin = adminAddress.toLowerCase() === userAddress.toLowerCase();
            adminControls.style.display = isAdmin ? 'block' : 'none';
        } catch (error) {
            console.error('Error checking admin status:', error);
        }
    }

    // Deposit USDT
    async function depositUSDT() {
        try {
            const amount = ethers.utils.parseUnits(depositAmount.value, 18);
            const tx = await contract.adminDeposit(amount);
            await tx.wait();
            showToast('Successfully deposited USDT');
            depositAmount.value = '';
            updateUI();
        } catch (error) {
            console.error('Error depositing USDT:', error);
            showToast('Error depositing USDT: ' + error.message);
        }
    }

    // Withdraw USDT
    async function withdrawUSDT() {
        try {
            const amount = ethers.utils.parseUnits(withdrawAmount.value, 18);
            const tx = await contract.adminWithdraw(amount);
            await tx.wait();
            showToast('Successfully withdrew USDT');
            withdrawAmount.value = '';
            updateUI();
        } catch (error) {
            console.error('Error withdrawing USDT:', error);
            showToast('Error withdrawing USDT: ' + error.message);
        }
    }

    // Add event listeners for admin functions
    depositTokenBtn.addEventListener('click', depositUSDT);
    withdrawTokenBtn.addEventListener('click', withdrawUSDT);
}); 