library Credit {

    struct CarbonCreditParcel{
        address seller;
        uint256 tokenId;
        uint256 maxCarbonUnits;
        uint256 pricePerCarbonUnit;
        uint256 timePeriod;
        string tokenURI;
        bytes signature;
    }
}