const express = require("express");
const router = express.Router();

const wrapAsync = require("../utils/wrapAsync.js");

const Listing = require("../models/listing.js");
const { isLoggedIn, isOwner, validateListing } = require("../middleware.js");

const listingController = require("../controllers/listings.js");
const multer = require("multer");
const { storage } = require("../cloudConfig.js");
const upload = multer({ storage });


console.log("Controller:", listingController);
console.log("index:", typeof listingController.index);
console.log("showListing:", typeof listingController.showListing);
console.log("createListing:", typeof listingController.createListing);
console.log("updateListing:", typeof listingController.updateListing);
console.log("destroyListing:", typeof listingController.destroyListing);
console.log("renderEditForm:", typeof listingController.renderEditForm);
console.log("getTrustScore:", typeof listingController.getTrustScore);


router.route("/")
    .get(wrapAsync(listingController.index))
    .post(
        isLoggedIn,
        upload.single("listing[image]"),
        validateListing,
        wrapAsync(listingController.createListing)
    );


// Search Route
router.get("/search", async (req, res) => {
    const { q } = req.query;

    if (!q || !q.trim()) {
        return res.redirect("/listings");
    }

    const listings = await Listing.find({
        $or: [
            { title: { $regex: q, $options: "i" } },
            { location: { $regex: q, $options: "i" } },
            { country: { $regex: q, $options: "i" } }
        ]
    });

    res.render("listings/search.ejs", { listings, q });
});


// NEW Route
router.get("/new", isLoggedIn, listingController.renderNewForm);


// ⭐ TRUSTGUARD ROUTE
router.get(
    "/:id/trust-score",
    wrapAsync(listingController.getTrustScore)
);


// SHOW / UPDATE / DELETE Route
router.route("/:id")
    .get(wrapAsync(listingController.showListing))
    .put(
        isLoggedIn,
        isOwner,
        upload.single("listing[image]"),
        validateListing,
        wrapAsync(listingController.updateListing)
    )
    .delete(
        isLoggedIn,
        isOwner,
        wrapAsync(listingController.destroyListing)
    );


// EDIT Route
router.get(
    "/:id/edit",
    isLoggedIn,
    isOwner,
    wrapAsync(listingController.renderEditForm)
);


module.exports = router;