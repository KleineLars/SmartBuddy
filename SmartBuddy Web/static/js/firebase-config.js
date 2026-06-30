// firebase-config.js
// Gedeelde Firebase configuratie voor SmartGrid games

const firebaseConfig = {
  apiKey: "AIzaSyDK6YGStByB4-q8YkxGtrmrXwoa2QvwyIU",
  authDomain: "smartgrid-510f5.firebaseapp.com",
  databaseURL: "https://smartgrid-510f5-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "smartgrid-510f5",
  storageBucket: "smartgrid-510f5.firebasestorage.app",
  messagingSenderId: "576979628548",
  appId: "1:576979628548:web:50bf812c8b1cd548edfb51",
  measurementId: "G-8QVXSM5W84"
};

// Initialize Firebase als het nog niet gedaan is
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.database();

// FIX voor Chrome Extensions: Forceer WebSockets in plaats van Long Polling
// Omdat Manifest V3 het inladen van externe scripts (long polling) blokkeert met CSP.
db.INTERNAL.forceWebSockets();
