const express = require("express");
const app = express();
const mongoose = require("mongoose");
const Listing = require("./models/listing");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-Mate");  
const wrapAsync = require("./utils/wrapAaync.js")
const ExpressError = require("./utils/ExpressError.js")
const {listingSchema, reviewSchema} = require("./schema.js");
const Review = require("./models/review.js");

const listings = require("./routes/listing.js");

const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust";

main()
.then(() => {
    console.log("Connected to MongoDB");
})
.catch((err) => {
    console.log( err);
});
async function main() {
    await mongoose.connect(MONGO_URL);
}


app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded ({extended: true}));
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "/public")));

app.get("/", (req, res) => {
    res.send("Hi, i am vishal");
});

const validateListing = (req, res, next) => {
    let { error } = listingSchema.validate(req.body);

    if (error) {
        let errMsg = error.details.map((el) => el.message).join(",");
        throw new ExpressError(400, errMsg);
    } else {
        next();
    }
};


const validateReview = (req, res, next) => {
    let {error} = reviewSchema.validate(req.body);
    if(error){
        let errMsg = error.details.map(el => el.message).join(",");
        throw new ExpressError(400, errMsg);
    } else {
        next();
    }
};

app.use("/listings", listings);

//Review Route
//Post Route for review
app.post("/listings/:id/reviews",
 validateReview,
  wrapAsync(async (req, res) => {
let listing = await Listing.findById(req.params.id);
let newReview = new Review(req.body.review);

listing.reviews.push(newReview);

await newReview.save();
await listing.save();

res.redirect(`/listings/${listing._id}`);
}));

//delete route for review
app.delete("/listings/:id/reviews/:reviewId",wrapAsync( async (req, res) => {
let {id, reviewId} = req.params;

await Listing.findByIdAndUpdate(id, {$pull: {reviews: reviewId}});
await Review.findById(reviewId);

res.redirect(`/listings/${id}`);
}));

//Index route
app.get("/listings",wrapAsync (async (req, res) => {
 const allListings = await Listing.find({});
   res.render("listings/index.ejs", {allListings}); 
}));

//New Route
app.get("/listings/new", (req, res) => {
    res.render("listings/new.ejs");
});


//show route
app.get("/listings/:id",wrapAsync( async (req, res) => {
    let {id} = req.params;
    const listing = await Listing.findById(id).populate("reviews");
    res.render("listings/show.ejs", {listing});
}));

//Create Route
app.post("/listings", 
    validateListing,
    wrapAsync ( async (req, res, next) => { 
         const newListing =new Listing(req.body.listing);
         await newListing.save();
         res.redirect("/listings");
    })
);

//Edit Route
app.get("/listings/:id/edit",wrapAsync ( async (req, res) => {
    let {id} = req.params;
    const listing = await Listing.findById(id);
    res.render("listings/edit.ejs", {listing});
}));

//Update Route
app.put("/listings/:id",wrapAsync (async (req, res) => {
    let {id} = req.params;
    await Listing.findByIdAndUpdate(id, req.body.listing);
  res.redirect(`/listings/${id}`);
}));

// Delet Route
app.delete("/listings/:id",wrapAsync ( async (req, res) => {
    let {id} = req.params;
   let deletedListing = await Listing.findByIdAndDelete(id);
   console.log("deletedListing ")
  res.redirect("/listings");
}));


app.use("/listings", listings);


// //delete route for review
// app.delete("/listings/:id/reviews/:reviewId",wrapAsync( async (req, res) => {
// let {id, reviewId} = req.params;

// await Listing.findByIdAndUpdate(id, {$pull: {reviews: reviewId}});
// await Review.findById(reviewId);

// res.redirect(`/listings/${id}`);
// }));


// app.get("/testListing", async (req, res) => {
// let  sampleListing = new listing({
//     title: "Beautiful Beach House",
//     description: "A stunning beach house with ocean views and modern amenities.",
//     price: "250",
//     location: "Malibu, California",
//     country: "INDIA",
// });

// await sampleListing.save();
// console.log("Sample was saved");
// res.send("successful test");
// });

app.use((req, res, next) => {
  next(new ExpressError(404, "Page Not Found!"));
});

app.use((err, req, res, next) => {
    let {statusCode = 500,  message = "Something is wrong" } = err;
    // res.status(statusCode).send(message);
    res.status(statusCode).render("listings/error.ejs", {message});
});

app.listen(8080, () => {
    console.log("Server is running on port 8080");
});