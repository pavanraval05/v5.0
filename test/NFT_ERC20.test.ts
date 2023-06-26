import { ethers, upgrades } from "hardhat";
import { expect } from "chai";
import { mine } from "@nomicfoundation/hardhat-network-helpers";
import { utils, BigNumber } from "ethers";
import { NFTDutchAuction_ERC20Bids } from "../typechain-types/contracts/NFT_ERC20.sol";

describe("NFTDutchAuction_ERC20Bids", function () {
  let auction: any;
  let erc20Token: any;
  let nftToken: any;
  let nftTokenId: any;
  let reservePrice;
  let numBlocksAuctionOpen;
  let offerPriceDecrement;
  let initialPrice;
  let bidder: any;
  let bidderAddress;
  let owner: any;
  let signer;

  beforeEach(async () => {
    [owner, bidder] = await ethers.getSigners();
    // Deploy ERC721 Token Contract
    const YourERC721Token = await ethers.getContractFactory("YourERC721Token");
    nftToken = await YourERC721Token.deploy();
    let tmpTokenID = await nftToken.mint(owner.address, "TokenNFT");

    // Deploy ERC20 Token Contract
    const YourERC20Token = await ethers.getContractFactory("YourERC20Token");
    erc20Token = await YourERC20Token.deploy();
    
    const upgradeNumber = "v1";

    // Set the required variables
    nftTokenId = 0;
    reservePrice = 10;
    numBlocksAuctionOpen = 10;
    offerPriceDecrement = 1;
    initialPrice = reservePrice + numBlocksAuctionOpen * offerPriceDecrement;

    // Deploy Auction Contract
    const DutchAuction = await ethers.getContractFactory("NFTDutchAuction_ERC20Bids");
    auction = await upgrades.deployProxy(DutchAuction, [
      upgradeNumber,
      erc20Token.address,
      nftToken.address,
      nftTokenId,
      reservePrice,
      numBlocksAuctionOpen,
      offerPriceDecrement,
    ], { kind: "uups", initializer: "initialize(string, address, address, uint256, uint256, uint256, uint256)", timeout: 0 });
    await auction.deployed();
  });

  async function createPermit(owner:any, spender:any, value:any, auction:any) {
    const chainId = await owner.getChainId();
    const deadline = ethers.constants.MaxUint256;
    const nonce = 2;

    return ethers.utils.splitSignature(
      await owner._signTypedData(
        {
          name: "NFTDutchAuction_ERC20Bids",
          version: "1",
          chainId,
          verifyingContract: auction.address,
        },
        {
          Permit: [
            { name: "owner", type: "address" },
            { name: "spender", type: "address" },
            { name: "value", type: "uint256" },
            { name: "nonce", type: "uint256" },
            { name: "deadline", type: "uint256" },
          ],
        },
        {
          owner: owner.address,
          spender,
          value,
          nonce,
          deadline,
        }
      )
    );
  }

  it("should allow a bidder to place a bid with ERC20 tokens using off-chain permit", async function () {
    const bidAmount = 10;
    await erc20Token.mint(bidder.address, 1000);

    expect(await auction.getCurrentPrice()).to.equal(18);

    const { v, r, s } = await createPermit(
      owner,
      bidder.address,
      bidAmount,
      auction
    );

    expect(await auction.getCurrentPrice()).to.equal(18);

    await erc20Token.approve(auction.address, 1000);

    await nftToken.approve(auction.address, nftTokenId);

    await erc20Token.connect(bidder).approve(auction.address, 10000);
    await erc20Token.mint(bidder.address, 100);
    await nftToken.mint(owner.address, "TokenNFT");
    const balance = await erc20Token.balanceOf(owner.address);
    await auction
      .connect(bidder)
      .bidvrs(19, true, v, r, s, ethers.constants.MaxUint256);

    
    // await auction.connect(bidder).bid(100);
    // await expect(auction.connect(bidder).bidvrs(1)).to.be.revertedWith("Auction has already ended");
    await expect(auction.connect(bidder).bidvrs(100, true, v, r, s, ethers.constants.MaxUint256)).to.be.revertedWith("Auction has already ended!");

    expect(await erc20Token.balanceOf(owner.address)).to.equal(balance.add(19));
  });

  it("should allow a bidder to place a bid with ERC20 tokens", async function () {
    const bidAmount = 10;
    await erc20Token.mint(bidder.address, 1000);
    expect(await auction.getCurrentPrice()).to.equal(18);

    await erc20Token.approve(auction.address, 1000);

    await nftToken.approve(auction.address, nftTokenId);

    await erc20Token.connect(bidder).approve(auction.address, 10000);
    await erc20Token.mint(bidder.address, 100);
    await nftToken.mint(owner.address, "TokenNFT");

    const balance = await erc20Token.balanceOf(owner.address);
    await auction.connect(bidder).bid(100);
    await expect(auction.connect(bidder).bid(1)).to.be.revertedWith("Auction has already ended");

    expect(await erc20Token.balanceOf(owner.address)).to.equal(balance.add(100));
  });

  it("should not allow a bidder to place a bid with insufficient ERC20 tokens", async function () {
    expect(await auction.getCurrentPrice()).to.equal(19);
    // await erc20Token.mint(bidder.address, 1000);
    await nftToken.approve(auction.address, nftTokenId);
    await erc20Token.approve(auction.address, 1);
    await erc20Token.connect(bidder).approve(auction.address, 1);

    const { v, r, s } = await createPermit(
      owner,
      bidder.address,
      100,
      auction
    );

    await expect(auction.connect(bidder).bid(100)).to.be.revertedWith("Bid amount accepted, but bid failed because not enough balance to transfer erc20 token");
    await expect(auction.connect(bidder).bidvrs(100, true, v, r, s, ethers.constants.MaxUint256)).to.be.revertedWith("Insufficient Token Allowance.");
    await erc20Token.approve(auction.address, 1000);
    await erc20Token.connect(bidder).approve(auction.address, 1000);
    await expect(auction.connect(bidder).bidvrs(100, true, v, r, s, ethers.constants.MaxUint256)).to.be.revertedWith("Not enough balance in the wallet.");
  });

  it("should not allow a bidder to place a bid with a low amount", async function () {
    expect(await auction.getCurrentPrice()).to.equal(19);
    await erc20Token.mint(bidder.address, 1000);
    const { v, r, s } = await createPermit(
      owner,
      bidder.address,
      100,
      auction
    );

    await nftToken.approve(auction.address, nftTokenId);
    await expect(auction.connect(bidder).bid(1)).to.be.revertedWith("The bid amount sent is too low");
    await expect(auction.connect(bidder).bidvrs(1, true, v, r, s, ethers.constants.MaxUint256)).to.be.revertedWith("The bid amount sent is too low");
  });

  it("should not allow a bidder to place a bid when the number of blocks is more than 10 ahead", async function () {
    expect(await auction.getCurrentPrice()).to.equal(19);

    const { v, r, s } = await createPermit(
      owner,
      bidder.address,
      100,
      auction
    );

    for (let i = 0; i < 20; i++)
      await nftToken.approve(auction.address, nftTokenId);

    expect(await auction.getCurrentPrice()).to.equal(10);
    await expect(auction.connect(bidder).bidvrs(100, true, v, r, s, ethers.constants.MaxUint256)).to.be.revertedWith("Auction Ended");
    await expect(auction.connect(bidder).bid(1)).to.be.revertedWith("Auction Ended");
  });

  it("Checking before proxy, the response of getMessage() function should be v1", async function () {
    expect(await auction.getMessage()).to.equal("v1");
  });

  it("Checking after proxy, the response of getMessage() function should be v2", async function () {
    const DutchAuction1 = await ethers.getContractFactory("NFTDutchAuction_ERC20Bids");
    auction = await upgrades.deployProxy(DutchAuction1, [
      "v2",
      erc20Token.address,
      nftToken.address,
      1,
      100,
      10,
      10,
    ], { kind: "uups", initializer: "initialize(string, address, address, uint256, uint256, uint256, uint256)", timeout: 0 });

    await auction.deployed();

    expect(await auction.getMessage()).to.equal("v2");
  });
});
