const mongoose = require('mongoose');

// Hybrid DB handler supporting Mongoose MongoDB connection with seamless in-memory fallback
let isConnectedToMongo = false;

const connectDB = async () => {
  const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/pro-collab';
  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 2500
    });
    isConnectedToMongo = true;
    console.log('MongoDB Connected successfully to:', mongoURI);
  } catch (err) {
    console.warn('MongoDB connection failed/offline. Falling back to robust in-memory data store mode.');
    isConnectedToMongo = false;
  }
};

const getDbStatus = () => isConnectedToMongo;

module.exports = { connectDB, getDbStatus };
