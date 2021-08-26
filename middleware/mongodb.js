const mongoose =require( 'mongoose');

const connectDB = handler => async (req, res) => {
  console.log(1,process.env.mongodburl)
  if (mongoose.connections[0].readyState) {
    // Use current db connection
    return handler(req, res);
  }
  // Use new db connection
  await mongoose.connect(process.env.mongodburl, {
    useUnifiedTopology: true,
    useFindAndModify: false,
    useCreateIndex: true,
    useNewUrlParser: true
  });
  return handler(req, res);
};

module.exports = connectDB;