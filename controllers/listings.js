const Listing = require("../models/listing");
const calculateTrustScore = require("../utils/trustGuard");

module.exports.index = async (req, res) => {
    const { category } = req.query;

    // Default: show ALL listings
    let allListings;

    if (!category) {
        allListings = await Listing.find({});
    } else {
        const categoryKeywords = {
            "Trending": ["trending", "popular", "best"],
            "Rooms": ["room", "bed", "suite", "villa", "house"],
            "Iconic Cities": ["city", "new york", "paris", "london", "tokyo", "dubai"],
            "Mountains": ["mountain", "hill", "himalaya", "alps"],
            "Castles": ["castle", "fort", "palace"],
            "Arctic": ["arctic", "snow", "ice", "winter"],
            "Camping": ["camp", "camping", "tent"],
            "Farms": ["farm", "farmland", "ranch"],
            "Amazing Pools": ["pool", "swimming", "resort"]
        };

        const keywords = categoryKeywords[category];

        if (!keywords) {
            // Unknown category → show all listings
            allListings = await Listing.find({});
        } else {
            allListings = await Listing.find({
                $or: keywords.flatMap(keyword => [
                    { title: { $regex: keyword, $options: "i" } },
                    { location: { $regex: keyword, $options: "i" } },
                    { country: { $regex: keyword, $options: "i" } }
                ])
            });
        }
    }

    res.render("listings/index.ejs", { allListings });
};

module.exports.renderNewForm = (req, res) => {
    res.render("listings/new.ejs");
};

module.exports.showListing = async (req, res) => {
    let { id } = req.params;

    const listing = await Listing.findById(id)
        .populate({
            path: "reviews",
            populate: {
                path: "author",
            },
        })
        .populate("owner");

    if (!listing) {
        req.flash("error", "Listing you requested for does not exist!");
        return res.redirect("/listings");
    }

    // Geocode listing location if coordinates are not already saved
    if (
        listing.location &&
        listing.country &&
        (
            !listing.geometry ||
            !listing.geometry.coordinates ||
            listing.geometry.coordinates.length !== 2
        )
    ) {
        try {
            const query = `${listing.location}, ${listing.country}`;

            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&limit=1`,
                {
                    headers: {
                        "User-Agent": "Wanderlust-Project/1.0"
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();

                if (data.length > 0) {
                    const latitude = parseFloat(data[0].lat);
                    const longitude = parseFloat(data[0].lon);

                    listing.geometry = {
                        type: "Point",
                        coordinates: [longitude, latitude],
                    };

                    await listing.save();
                }
            }
        } catch (error) {
            console.log("Geocoding error:", error.message);
        }
    }

    console.log(listing);

    res.render("listings/show.ejs", { listing });
};


// CREATE LISTING
module.exports.createListing = async (req, res) => {

    // Check whether an image was uploaded
    if (!req.file) {
        req.flash(
            "error",
            "Please upload a listing image before creating the listing."
        );

        return res.redirect("/listings/new");
    }

    let url = req.file.path;
    let filename = req.file.filename;

    console.log(url, "..", filename);

    const newListing = new Listing(req.body.listing);

    newListing.owner = req.user._id;

    newListing.image = {
        url,
        filename
    };

    await newListing.save();

    req.flash("success", "New Listing Created!");

    res.redirect("/listings");
};


module.exports.renderEditForm = async (req, res) => {
    const { id } = req.params;

    const listing = await Listing.findById(id);

    if (!listing) {
        req.flash("error", "Listing you requested for does not exist!");
        return res.redirect("/listings");
    }

    let originalImageUrl = listing.image.url;

    originalImageUrl = originalImageUrl.replace(
        "/upload",
        "/upload/w_250"
    );

    res.render("listings/edit.ejs", {
        listing,
        originalImageUrl
    });
};


module.exports.updateListing = async (req, res) => {
    let { id } = req.params;

    let listing = await Listing.findByIdAndUpdate(
        id,
        {
            ...req.body.listing,
        },
        { new: true }
    );

    if (typeof req.file !== "undefined") {
        let url = req.file.path;
        let filename = req.file.filename;

        listing.image = {
            url,
            filename
        };

        await listing.save();
    }

    // Remove old coordinates so the updated location
    // gets geocoded again when the listing is opened.
    if (req.body.listing.location || req.body.listing.country) {
        listing.geometry = undefined;
        await listing.save();
    }

    req.flash("success", "Listing Updated!");

    res.redirect(`/listings/${id}`);
};


module.exports.destroyListing = async (req, res) => {
    let { id } = req.params;

    let deletedListing = await Listing.findByIdAndDelete(id);

    console.log(deletedListing);

    req.flash("success", "Listing Deleted!");

    res.redirect("/listings");
};
module.exports.getTrustScore = async (req, res) => {
    try {
        const { id } = req.params;

        const listing = await Listing.findById(id);

        if (!listing) {
            return res.status(404).json({
                error: "Listing not found"
            });
        }

        const trustResult = await calculateTrustScore(listing);

        res.json(trustResult);

    } catch (error) {
        console.log("TrustGuard error:", error.message);

        res.status(500).json({
            error: "Unable to calculate trust score"
        });
    }
};