# Decentralized Lucky Draw

A decentralized lucky draw application built on the BNB Chain (BEP-20) that allows users to participate in a lottery by paying a fixed amount of BNB or tokens. The winner is selected randomly using Chainlink VRF for true randomness.

## Features

- Connect MetaMask wallet
- Enter lucky draw with fixed BNB or token amount
- Real-time countdown timer
- Automatic winner selection using Chainlink VRF
- Admin controls for drawing winners
- Responsive design with modern UI
- Toast notifications for user feedback
- **Winner history** - View all past winners and their prizes
- **Leaderboard** - See top participants with the most entries
- **Auto-draw** - Automatic winner selection using Chainlink Keepers
- **Multi-round draws** - Participate in consecutive rounds
- **Participation NFTs** - Receive NFTs for each participation
- **Token-based entry** - Use BEP-20 tokens instead of BNB

## Prerequisites

- Node.js (v14 or higher)
- MetaMask wallet
- BNB Chain network configured in MetaMask
- Some BNB for gas fees and participation (or tokens if using token-based entry)
- Chainlink VRF subscription
- Chainlink Keeper for auto-draw functionality

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd lucky-draw
```

2. Install dependencies:
```bash
npm install
```

3. Configure the smart contract:
   - Update the Chainlink VRF configuration in `contracts/LuckyDraw.sol`
   - Set your desired entry fee, max participants, and deadline
   - Configure auto-draw interval for Chainlink Keepers
   - Set up token-based entry if desired
   - Deploy the contract to BNB Chain testnet/mainnet

4. Update the frontend configuration:
   - Open `src/app.js`
   - Replace `YOUR_CONTRACT_ADDRESS` with your deployed contract address
   - Add your contract ABI to the `CONTRACT_ABI` array

5. Start the development server:
```bash
npm start
```

## Smart Contract Configuration

The smart contract uses the following parameters:
- Entry Fee: Configurable (BNB or tokens)
- Commission: 14%
- Max Participants: Configurable
- Deadline: Configurable
- Auto-draw Interval: Configurable
- Multi-round Support: Enabled by default
- NFT Minting: Automatic for each participation

## Usage

1. Connect your MetaMask wallet
2. Ensure you have enough BNB for gas fees and participation (or tokens if using token-based entry)
3. Click "Enter Lucky Draw" to participate
4. Wait for the draw deadline or max participants to be reached
5. Winner is automatically selected (or admin can trigger manually)
6. Winner automatically receives the prize pool (minus commission)
7. View your participation NFTs in the "My NFTs" tab
8. Check the leaderboard to see top participants
9. View winner history in the "Winners" tab

## Security

- The contract uses Chainlink VRF for true randomness
- Only the admin can trigger the winner selection manually
- Participants can only enter once per round
- Commission is automatically calculated and withheld
- Chainlink Keepers ensure reliable auto-draw functionality

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. 