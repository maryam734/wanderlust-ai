const Listing = require("../models/listing");

async function calculateTrustScore(listing) {
    let score = 100;
    const signals = [];

    // ==========================================
    // 1. REVIEW COUNT
    // ==========================================

    const reviewCount = listing.reviews
        ? listing.reviews.length
        : 0;

    if (reviewCount === 0) {
        score -= 20;

        signals.push({
            type: "warning",
            text: "This listing has no reviews yet."
        });

    } else if (reviewCount < 3) {
        score -= 12;

        signals.push({
            type: "warning",
            text: "This listing has very few reviews."
        });

    } else if (reviewCount >= 10) {

        signals.push({
            type: "positive",
            text: "This listing has a healthy number of reviews."
        });
    }


    // ==========================================
    // 2. RATING CHECK
    // ==========================================

    const rating = Number(listing.rating) || 0;

    if (rating >= 4.5 && reviewCount < 5) {
        score -= 10;

        signals.push({
            type: "warning",
            text: "The rating is very high despite having relatively few reviews."
        });

    } else if (rating >= 4.0 && reviewCount >= 5) {

        signals.push({
            type: "positive",
            text: "The listing has a strong rating supported by multiple reviews."
        });
    }


    // ==========================================
    // 3. LISTING COMPLETENESS
    // ==========================================

    if (!listing.title || listing.title.trim().length < 10) {
        score -= 5;

        signals.push({
            type: "warning",
            text: "The listing has a short or incomplete title."
        });
    }

    if (!listing.description || listing.description.trim().length < 50) {
        score -= 8;

        signals.push({
            type: "warning",
            text: "The listing description appears incomplete."
        });

    } else {

        signals.push({
            type: "positive",
            text: "The listing contains a detailed description."
        });
    }


    // ==========================================
    // 4. IMAGE CHECK
    // ==========================================

    if (!listing.image || !listing.image.url) {
        score -= 10;

        signals.push({
            type: "warning",
            text: "The listing does not contain a valid image."
        });

    } else {

        signals.push({
            type: "positive",
            text: "The listing contains an uploaded image."
        });
    }


    // ==========================================
    // 5. LOCATION CHECK
    // ==========================================

    if (!listing.location || !listing.country) {
        score -= 8;

        signals.push({
            type: "warning",
            text: "Location information appears incomplete."
        });

    } else {

        signals.push({
            type: "positive",
            text: "Location information is available."
        });
    }


    // ==========================================
    // 6. PRICE ANOMALY DETECTION
    // ==========================================

    const currentPrice = Number(listing.price);

    if (
        currentPrice &&
        currentPrice > 0 &&
        listing.location &&
        listing.country
    ) {

        // Find comparable listings:
        // same location + same country
        // excluding the current listing

        const comparableListings = await Listing.find({
            _id: { $ne: listing._id },
            location: {
                $regex: `^${escapeRegex(listing.location)}$`,
                $options: "i"
            },
            country: {
                $regex: `^${escapeRegex(listing.country)}$`,
                $options: "i"
            },
            price: { $exists: true, $gt: 0 }
        }).select("price");


        // We need enough listings for a meaningful comparison

        if (comparableListings.length >= 3) {

            const prices = comparableListings
                .map(item => Number(item.price))
                .filter(price => price > 0)
                .sort((a, b) => a - b);


            const medianPrice = getMedian(prices);


            if (medianPrice > 0) {

                const priceRatio =
                    currentPrice / medianPrice;


                const percentageDifference =
                    Math.round(
                        (1 - priceRatio) * 100
                    );


                // Extremely cheap compared with similar listings

                if (priceRatio < 0.5) {

                    score -= 20;

                    signals.push({
                        type: "warning",

                        text:
                            `This listing is approximately ${Math.max(
                                percentageDifference,
                                0
                            )}% cheaper than comparable listings in the same location.`
                    });


                // Significantly cheaper

                } else if (priceRatio < 0.7) {

                    score -= 12;

                    signals.push({
                        type: "warning",

                        text:
                            `This listing is approximately ${Math.max(
                                percentageDifference,
                                0
                            )}% cheaper than comparable listings in the same location.`
                    });


                // Slightly cheaper, but still reasonable

                } else if (priceRatio < 0.85) {

                    score -= 5;

                    signals.push({
                        type: "warning",

                        text:
                            `The listing price is somewhat below the typical price for similar properties nearby.`
                    });


                // Price looks normal

                } else {

                    signals.push({
                        type: "positive",

                        text:
                            "The listing price is consistent with comparable properties in the same location."
                    });
                }
            }

        } else {

            // Not enough data for reliable comparison

            signals.push({
                type: "info",

                text:
                    "There are not enough comparable listings to perform a reliable price analysis."
            });
        }
    }


    // ==========================================
    // 7. KEEP SCORE BETWEEN 0 AND 100
    // ==========================================

    score = Math.max(
        0,
        Math.min(100, score)
    );


    // ==========================================
    // 8. RISK LEVEL
    // ==========================================

    let riskLevel;

    if (score >= 80) {

        riskLevel = "Low Risk";

    } else if (score >= 60) {

        riskLevel = "Moderate Risk";

    } else {

        riskLevel = "High Risk";
    }


    // ==========================================
    // FINAL RESULT
    // ==========================================

    return {
        score,
        riskLevel,
        signals
    };
}


// ==========================================
// MEDIAN FUNCTION
// ==========================================

function getMedian(numbers) {

    const middle =
        Math.floor(numbers.length / 2);


    if (numbers.length % 2 === 0) {

        return (
            numbers[middle - 1] +
            numbers[middle]
        ) / 2;

    }

    return numbers[middle];
}


// ==========================================
// ESCAPE REGEX SPECIAL CHARACTERS
// ==========================================

function escapeRegex(text) {

    return text.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );
}


module.exports = calculateTrustScore;