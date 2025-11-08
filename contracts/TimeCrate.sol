// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title TimeCrate
 * @dev NFT-based time-locked content delivery system with distributed keeper nodes
 */
contract TimeCrate is ERC721, ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

    struct Crate {
        string ipfsCid;
        uint256 releaseTime;
        string[] keeperUrls;
        bool released;
        uint256 createdAt;
    }

    mapping(uint256 => Crate) public crateInfo;

    event CrateCreated(
        uint256 indexed tokenId,
        address indexed owner,
        string ipfsCid,
        uint256 releaseTime,
        string[] keeperUrls
    );

    event CrateReleased(
        uint256 indexed tokenId,
        address indexed owner,
        uint256 releasedAt
    );

    constructor() ERC721("TimeCrate", "CRATE") {}

    /**
     * @dev Creates a new time-locked crate
     * @param _recipient Address to receive the NFT
     * @param _ipfsCid IPFS CID of encrypted content
     * @param _releaseTime Unix timestamp when content can be released
     * @param _tokenURI Metadata URI for the NFT
     * @param _keeperUrls Array of keeper node URLs holding key shares
     * @return tokenId of newly created crate
     */
    function createCrate(
        address _recipient,
        string memory _ipfsCid,
        uint256 _releaseTime,
        string memory _tokenURI,
        string[] memory _keeperUrls
    ) public returns (uint256) {
        require(_recipient != address(0), "Invalid recipient address");
        require(_releaseTime > block.timestamp, "Release time must be in the future");
        require(bytes(_ipfsCid).length > 0, "IPFS CID cannot be empty");
        require(_keeperUrls.length > 0, "Must provide at least one keeper URL");

        uint256 tokenId = _tokenIdCounter.current();
        _safeMint(_recipient, tokenId);
        _setTokenURI(tokenId, _tokenURI);

        crateInfo[tokenId] = Crate({
            ipfsCid: _ipfsCid,
            releaseTime: _releaseTime,
            keeperUrls: _keeperUrls,
            released: false,
            createdAt: block.timestamp
        });

        emit CrateCreated(tokenId, _recipient, _ipfsCid, _releaseTime, _keeperUrls);

        _tokenIdCounter.increment();
        return tokenId;
    }

    /**
     * @dev Checks if a crate is ready to be released based on time
     * @param _tokenId Token ID to check
     * @return bool indicating if release time has passed
     */
    function isReleaseReady(uint256 _tokenId) public view returns (bool) {
        require(_ownerOf(_tokenId) != address(0), "Token does not exist");
        return block.timestamp >= crateInfo[_tokenId].releaseTime;
    }

    /**
     * @dev Marks a crate as released (can be called by owner after retrieving content)
     * @param _tokenId Token ID to mark as released
     */
    function markAsReleased(uint256 _tokenId) public {
        require(_ownerOf(_tokenId) != address(0), "Token does not exist");
        require(ownerOf(_tokenId) == msg.sender, "Only token owner can mark as released");
        require(isReleaseReady(_tokenId), "Release time has not passed");
        require(!crateInfo[_tokenId].released, "Already marked as released");

        crateInfo[_tokenId].released = true;
        emit CrateReleased(_tokenId, msg.sender, block.timestamp);
    }

    /**
     * @dev Get complete crate information including keeper URLs
     * @param _tokenId Token ID to query
     * @return ipfsCid IPFS content identifier
     * @return releaseTime Unix timestamp for release
     * @return keeperUrls Array of keeper node URLs
     * @return released Whether content has been retrieved
     * @return createdAt When the crate was created
     */
    function getCrateInfo(uint256 _tokenId) 
        public 
        view 
        returns (
            string memory ipfsCid,
            uint256 releaseTime,
            string[] memory keeperUrls,
            bool released,
            uint256 createdAt
        ) 
    {
        require(_ownerOf(_tokenId) != address(0), "Token does not exist");
        Crate memory crate = crateInfo[_tokenId];
        return (
            crate.ipfsCid,
            crate.releaseTime,
            crate.keeperUrls,
            crate.released,
            crate.createdAt
        );
    }

    /**
     * @dev Get only keeper URLs for a specific token
     * @param _tokenId Token ID to query
     * @return Array of keeper URLs
     */
    function getKeeperUrls(uint256 _tokenId) public view returns (string[] memory) {
        require(_ownerOf(_tokenId) != address(0), "Token does not exist");
        return crateInfo[_tokenId].keeperUrls;
    }

    /**
     * @dev Get time remaining until release
     * @param _tokenId Token ID to query
     * @return seconds remaining (0 if already ready)
     */
    function getTimeUntilRelease(uint256 _tokenId) public view returns (uint256) {
        require(_ownerOf(_tokenId) != address(0), "Token does not exist");
        uint256 releaseTime = crateInfo[_tokenId].releaseTime;
        if (block.timestamp >= releaseTime) {
            return 0;
        }
        return releaseTime - block.timestamp;
    }

    /**
     * @dev Get all token IDs owned by an address
     * @param _owner Address to query
     * @return Array of token IDs
     */
    function tokensOfOwner(address _owner) public view returns (uint256[] memory) {
        uint256 tokenCount = balanceOf(_owner);
        uint256[] memory tokenIds = new uint256[](tokenCount);
        uint256 currentIndex = 0;

        for (uint256 i = 0; i < _tokenIdCounter.current(); i++) {
            if (_ownerOf(i) != address(0) && ownerOf(i) == _owner) {
                tokenIds[currentIndex] = i;
                currentIndex++;
            }
        }

        return tokenIds;
    }

    /**
     * @dev Get total number of crates created
     * @return Total count
     */
    function totalSupply() public view returns (uint256) {
        return _tokenIdCounter.current();
    }

    // Override required functions
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
        delete crateInfo[tokenId];
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}