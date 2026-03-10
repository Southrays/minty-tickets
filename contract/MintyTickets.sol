// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title Minty Tickets
 * @author Southrays
 * @notice AI-Powered Intelligent NFT Event Infrastructure on 0G
 * @dev Optimized for deployment safety & gas efficiency
 * This contracts helps to reduce event ticket reselling
 * Contract: 0x930ABC3c96401F7AcbEf5391eAf6f1a9918e8d5e
 * AI Signer: 0x2032Fa3f981eCc614f459e43d1D7CE17A604A9C4
 */
contract MintyTickets is ERC721, Ownable, ReentrancyGuard, Pausable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;


    ///////////////////////////
    /////     Errors     /////
    /////////////////////////
    error InvalidSigner();
    error InvalidEventTime();
    error InvalidTicket();
    error TicketsMustBeMoreThanZero();
    error TicketIsSoulBound();
    error MustBeEventOrganizer();
    error InvalidEvent();
    error InactiveEvent();
    error EventHasEnded();
    error EventIsSoldOut();
    error InsufficientFunds();
    error WithdrawFailed();
    error AllTicketTypesMustHavePrices();
    error YouHaveAlreadyBoughtTickets();
    error YouHaveReachedYourPurchasingLimit();
    error YouHaveAlreadyCheckedIn();
    error Expired();
    error lengthVerificationMismatch();
    error BatchIsTooLong();
    error NoRoot();
    error MustBeContractOwner();
    error RefundFailed();
    error RiskyTicket();
    error NonceUsed();


    ///////////////////////////
    /////     Events     /////
    /////////////////////////
    event EventCreated(uint256 indexed eventId, address indexed organizer);
    event TicketMinted(uint256 indexed tokenId, uint256 indexed eventId, address buyer);
    event TicketCheckedIn(uint256 indexed tokenId, uint256 indexed eventId);
    event Withdrawal(address withdrawer, uint256 amount);
    event MetadataUpdated(uint256 indexed tokenId, string newCid);
    event MerkleRootUpdated(uint256 indexed eventId, bytes32 root);
    event AiSignerUpdated(address newSigner);


    /////////////////////////////////////
    /////     Type Declarations    /////
    ///////////////////////////////////
    struct Event {
        uint256  id;
        address  organizer;
        string   name;
        string   metadataCid;
        uint256  startTime;
        uint256  endTime;
        uint256  ticketPrice;
        uint256  maxTickets;
        uint256  soldTickets;
        string   imageURI;
        bytes32  merkleRoot;
        bool     acceptsOffchainTickets;
    }

    struct Ticket {
        uint256 eventId;
        string  metadataCid;
        bool    checkedIn;
        uint256 mintTime;
    }


    //////////////////////////////
    /////     Variables     /////
    ////////////////////////////
    uint256 public constant MAX_RISK_SCORE = 100;
    uint256 public constant RISK_THRESHOLD = 70;
    uint256 public constant LOYALTY_PER_ATTENDANCE = 10;
    uint256 public s_ticketFee = 2;
    uint256 private s_feesBalance;

    address public aiSigner;

    uint256 private s_nextTokenId = 1;
    uint256 private s_nextEventId = 1;
    uint256 private s_totalTicketsSold;


    mapping(uint256 => Event) public events;
    mapping(uint256 => Ticket) public tickets;
    mapping(address => mapping(uint256 => uint256)) public userEventTicket;
    mapping(address => uint256) s_organizerBalance;
    mapping(address => uint256[]) private s_userTickets;
    mapping(address => uint256[]) private s_organizerEvents;

    mapping(bytes32 nonce => bool isNonceUsed) public usedNonces;


    ////////////////////////////////
    /////     Constructor     /////
    //////////////////////////////
    constructor(address _aiSigner)
        ERC721("Minty Ticket", "MTY")
        Ownable(msg.sender)
    {
        if (_aiSigner == address(0)) revert InvalidSigner();
        aiSigner = _aiSigner;
    }


    ///////////////////////////////////////
    /////     Receive & Fallback     /////
    /////////////////////////////////////
    // reverts all misdirected payments
    receive() external payable {
        revert InvalidEvent();
    }
    fallback() external payable {
        revert InvalidEvent();
    }


    ///////////////////////////////////////
    /////     External Functions     /////
    /////////////////////////////////////
    // This function creates new events
    function createEvent( 
        string calldata name, 
        string calldata metadataCid, 
        uint256 startTime, 
        uint256 endTime, 
        uint256 _ticketPrice, 
        uint256 maxTickets, 
        string memory _imageURI,
        bool _acceptsOffchainTickets 
    ) external whenNotPaused returns (uint256) { 
        if (startTime < block.timestamp) revert InvalidEventTime(); 
        if (endTime < startTime) revert InvalidEventTime(); 
        if (maxTickets == 0) revert TicketsMustBeMoreThanZero();

        uint256 eventId = s_nextEventId++; 
        s_organizerEvents[msg.sender].push(eventId); 
        events[eventId] = Event({ 
            id: eventId, 
            organizer: msg.sender, 
            name: name, 
            metadataCid: metadataCid, 
            startTime: startTime, 
            endTime: endTime, 
            ticketPrice: _ticketPrice, 
            maxTickets: maxTickets, 
            soldTickets: 0, 
            imageURI: _imageURI, 
            merkleRoot: bytes32(0),
            acceptsOffchainTickets: _acceptsOffchainTickets 
        }); 
        
        emit EventCreated(eventId, msg.sender); 
        return eventId; 
    }


    // This function allows users to buy tickets
    function buyTicket(
        uint256 _eventId, 
        string calldata _ticketMetaCid
        )
        external
        payable
        nonReentrant
        whenNotPaused
        returns (uint256)
    {
        if (_eventId == 0 || _eventId >= s_nextEventId) revert InvalidEvent();
        Event storage evt = events[_eventId];

        uint256 basePrice = evt.ticketPrice;
        uint256 ticketFee = (basePrice * s_ticketFee) / 100;
        uint256 ticketPrice = basePrice + ticketFee;
        
        if (block.timestamp >= evt.endTime) revert EventHasEnded();
        if (evt.soldTickets >= evt.maxTickets) revert EventIsSoldOut();
        if (msg.value < ticketPrice) revert InsufficientFunds();
        if (userEventTicket[msg.sender][_eventId] != 0) revert YouHaveAlreadyBoughtTickets();

        uint256 tokenId = s_nextTokenId++;
        _safeMint(msg.sender, tokenId);

        tickets[tokenId] = Ticket({
            eventId: _eventId,
            metadataCid: _ticketMetaCid,
            checkedIn: false,
            mintTime: block.timestamp
        });

        if (msg.value > ticketPrice) {
            (bool success, ) = payable(msg.sender).call{value: msg.value - ticketPrice}("");
            if (!success) revert RefundFailed();
        }

        evt.soldTickets ++;
        userEventTicket[msg.sender][_eventId] = tokenId;
        s_userTickets[msg.sender].push(tokenId);
        s_totalTicketsSold ++;

        s_organizerBalance[evt.organizer] += basePrice;
        s_feesBalance += ticketFee;

        emit TicketMinted(tokenId, _eventId, msg.sender);
        return tokenId;
    }

    
    function checkIn(
        uint256 tokenId,
        bytes32 nonce,
        uint256 expiration,
        bytes calldata signature
    ) external nonReentrant whenNotPaused {
        if (usedNonces[nonce]) revert NonceUsed();
        if (block.timestamp > expiration) revert Expired();
        if (tokenId == 0 || tokenId >= s_nextTokenId) revert InvalidTicket();

        address ownerAddr = ownerOf(tokenId);
        Ticket storage tkt = tickets[tokenId];

        if (tkt.checkedIn) revert YouHaveAlreadyCheckedIn();

        bytes32 hash = keccak256(
            abi.encodePacked(tokenId, ownerAddr, tkt.eventId, nonce, expiration)
        );

        address signer = hash.toEthSignedMessageHash().recover(signature);
        if (signer != ownerAddr) revert InvalidSigner();

        usedNonces[nonce] = true;

        tkt.checkedIn = true;

        emit TicketCheckedIn(tokenId, tkt.eventId);
    }

    
    function syncOfflineCheckIns(
        uint256 eventId,
        uint256[] calldata tokenIds,
        bytes32[][] calldata proofs
    ) external nonReentrant {
        if (eventId == 0 || eventId >= s_nextEventId) revert InvalidEvent();
        if (events[eventId].organizer != msg.sender && msg.sender != owner()) revert MustBeEventOrganizer();
        if (tokenIds.length != proofs.length) revert lengthVerificationMismatch();
        if (tokenIds.length > 50) revert BatchIsTooLong();

        bytes32 root = events[eventId].merkleRoot;
        if (root == bytes32(0)) revert NoRoot();

        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            if (tickets[tokenId].checkedIn) continue;

            address ownerAddr = ownerOf(tokenId);
            bytes32 leaf = keccak256(abi.encodePacked(tokenId, ownerAddr, eventId));

            if (_verifyMerkle(leaf, proofs[i], root)) {
                tickets[tokenId].checkedIn = true;

                emit TicketCheckedIn(tokenId, eventId);
            }
        }
    }


    function withdrawOrganizerFunds() external nonReentrant {
        uint256 amount = s_organizerBalance[msg.sender];
        if (amount == 0) revert InsufficientFunds();

        s_organizerBalance[msg.sender] = 0;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) revert WithdrawFailed();

        emit Withdrawal(msg.sender, amount);
    }


    function withdrawFees() external onlyOwner nonReentrant {
        if (s_feesBalance == 0) revert InsufficientFunds();

        (bool success, ) = payable(msg.sender).call{value: s_feesBalance}("");
        if (!success) revert WithdrawFailed();

        emit Withdrawal(msg.sender, s_feesBalance);
        s_feesBalance == 0;
    }


    function setAiSigner(address newSigner) external onlyOwner {
        if (newSigner == address(0)) revert InvalidSigner();
        aiSigner = newSigner;
        emit AiSignerUpdated(newSigner);
    }


    function updateMerkleRoot(uint256 eventId, bytes32 root) external {
        if (eventId == 0 || eventId >= s_nextEventId) revert InvalidEvent();
        if (events[eventId].organizer != msg.sender && msg.sender != owner()) revert MustBeEventOrganizer();
        events[eventId].merkleRoot = root;
        emit MerkleRootUpdated(eventId, root);
    }

    function updateTicketMetadata(uint256 tokenId, string calldata newCid) external {
        if (msg.sender != aiSigner && msg.sender != owner()) revert InvalidSigner();
        tickets[tokenId].metadataCid = newCid;
        emit MetadataUpdated(tokenId, newCid);
    }


    /////////////////////////////////////
    /////     Public Functions     /////
    ///////////////////////////////////
    function transferFrom(address, address, uint256) public pure override {
        revert TicketIsSoulBound();
    }

    function safeTransferFrom(address, address, uint256) public pure override {
        revert TicketIsSoulBound();
    }

    function safeTransferFrom(address, address, uint256, bytes memory) public pure override {
        revert TicketIsSoulBound();
    }


    ///////////////////////////////////////
    /////     Internal Functions     /////
    /////////////////////////////////////
    function _verifyMerkle(bytes32 leaf, bytes32[] calldata proof, bytes32 root)
        internal pure returns (bool)
    {
        bytes32 computed = leaf;
        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 el = proof[i];
            computed = computed <= el
                ? keccak256(abi.encodePacked(computed, el))
                : keccak256(abi.encodePacked(el, computed));
        }
        return computed == root;
    }



    ////////////////////////////////////////////////////
    /////    Public & External View Functions     /////
    //////////////////////////////////////////////////
    function totalEvents() external view returns (uint256) {
        return s_nextEventId - 1;
    }

    function totalTicketsSold() external view returns (uint256) {
        return s_totalTicketsSold;
    }

    function getUserTicketIds(address user) external view returns (uint256[] memory) {
        return s_userTickets[user];
    }

    function getOrganizerEvents(address organizer)
        external
        view
        returns (uint256[] memory)
    {
        return s_organizerEvents[organizer];
    }


    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        if (tokenId == 0 || tokenId >= s_nextTokenId) revert InvalidTicket();
        if (_ownerOf(tokenId) == address(0)) revert InvalidTicket();
        return string(
        abi.encodePacked(
            "https://indexer-storage-testnet-standard.0g.ai/file/",
            tickets[tokenId].metadataCid
        )
    );
}
}