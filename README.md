# Decentralized Lucky Draw

A decentralized lucky draw application built on the BNB Chain (BEP-20) that allows users to participate in a lottery by paying a fixed amount of BNB or tokens. The winner is selected randomly using Chainlink VRF for true randomness.

[![License](https://img.shields.io/github/license/Bannysukumar/lucky-draw)](https://github.com/Bannysukumar/lucky-draw/blob/main/LICENSE) [![Stars](https://img.shields.io/github/stars/Bannysukumar/lucky-draw)](https://github.com/Bannysukumar/lucky-draw/stargazers) [![Last commit](https://img.shields.io/github/last-commit/Bannysukumar/lucky-draw)](https://github.com/Bannysukumar/lucky-draw/commits/main)

## Overview

A decentralized lucky draw application built on the BNB Chain (BEP-20) that allows users to participate in a lottery by paying a fixed amount of BNB or tokens. The winner is selected randomly using Chainlink VRF for true randomness.


What is actually in the repository: `contracts/LuckyDraw.sol`, `contracts/`, `src/`. GitHub reports the primary language as JavaScript.

## Features


- Connect MetaMask wallet
- Enter lucky draw with fixed BNB or token amount
- Real-time countdown timer
- Automatic winner selection using Chainlink VRF
- Admin controls for drawing winners
- Responsive design with modern UI
- Toast notifications for user feedback
- Winner history - View all past winners and their prizes
- Leaderboard - See top participants with the most entries
- Auto-draw - Automatic winner selection using Chainlink Keepers
- Multi-round draws - Participate in consecutive rounds
- Participation NFTs - Receive NFTs for each participation

## Tech Stack

| Technology | Where it shows up |
|---|---|
| Solidity | Smart contracts |
| OpenZeppelin | Smart-contract base contracts |

## Project Architecture

Browser page → Solidity contract. The HTML references MetaMask.

## Project Structure

```text
lucky-draw/
├── contracts/
├── src/
```

## Getting Started

```bash
git clone https://github.com/Bannysukumar/lucky-draw.git
cd lucky-draw
```

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## License

Licensed under MIT. See [LICENSE](LICENSE).

## Author

[Banny Sukumar](https://github.com/Bannysukumar)

- GitHub: [@Bannysukumar](https://github.com/Bannysukumar)
- Portfolio: [adepu-sukumar.vercel.app](https://adepu-sukumar.vercel.app/)
- LinkedIn: [Adepu Sukumar](https://www.linkedin.com/in/adepu-sukumar-59b423351)
