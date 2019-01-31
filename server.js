const dotenv = require('dotenv').config();
const express = require('express');
const app = express();

const crypto = require('crypto');
const nonce = require('nonce')();
const querystring = require('querystring');
const request = require('request-promise');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const getRawBody = require('raw-body');

const apiKey = process.env.SHOPIFY_API_KEY;
const apiSecret = process.env.SHOPIFY_API_SECRET;
const scopes = 'read_products,read_customers,read_orders,read_draft_orders,read_fulfillments,write_customers';
const forwardingAddress = "https://524213fd.ngrok.io"; // Replace this with your HTTPS Forwarding address

var globalCode, globalPoints;
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
//connected to MongoDB
mongoose.connect("mongodb://Protolabz:Protolabz123@ds153824.mlab.com:53824/loyalty",{useNewUrlParser: true})
.then(()=>{
  console.log("Mongo DB is Connected");
})
.catch(err => console.log(err));

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.get('/shopify', (req, res) => {
    const shop = req.query.shop;
    if (shop) {
      const state = nonce();
      const redirectUri = forwardingAddress + '/shopify/callback';
      const installUrl = 'https://' + shop +
        '/admin/oauth/authorize?client_id=' + apiKey +
        '&scope=' + scopes +
        '&state=' + state +
        '&redirect_uri=' + redirectUri;

      res.cookie('state', state);
      res.redirect(installUrl);
    } else {
      return res.status(400).send('Missing shop parameter. Please add ?shop=your-development-shop.myshopify.com to your request');
    }
  });

app.get('/shopify/callback', (req, res) => {
  const { shop, hmac, code, state } = req.query;
  console.log(hmac);
  const map = Object.assign({}, req.query);
  delete map['signature'];
  delete map['hmac'];
  const message = querystring.stringify(map);
  const providedHmac = Buffer.from(hmac, 'utf-8');
  var accessToken;
  const generatedHash = Buffer.from(
    crypto
      .createHmac('sha256', apiSecret)
      .update(message)
      .digest('hex'),
      'utf-8'
    );
  let hashEquals = false;
  try {
    hashEquals = crypto.timingSafeEqual(generatedHash, providedHmac)
  } catch (e) {
    hashEquals = false;
  };
  if (!hashEquals) {
    return res.status(400).send('HMAC validation failed');
  }
    const accessTokenRequestUrl = 'https://' + shop + '/admin/oauth/access_token';
    const accessTokenPayload = {
      client_id: apiKey,
      client_secret: apiSecret,
      code,
    };
    request.post(accessTokenRequestUrl, { json: accessTokenPayload })
    .then((accessTokenResponse) => {
        accessToken = accessTokenResponse.access_token;
        console.log("Got an access token, let's do something with it pardeep: "+accessToken);
        res.render(__dirname + '/views/installed');
    });
});

app.listen( process.env.PORT || 4300, () => {
  var now = new Date();
  console.log('[ Example app listening on port 4300! ] '+ now);
});
