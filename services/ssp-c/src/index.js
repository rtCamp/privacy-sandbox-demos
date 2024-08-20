/*
 Copyright 2022 Google LLC

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

      https://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

// SSP_C
import express from 'express';
import path from 'path';
import {readFile} from 'fs/promises';
import url from 'url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const {
  EXTERNAL_PORT,
  PORT,
  SSP_A_HOST,
  SSP_B_HOST,
  SSP_C_DETAIL,
  SSP_C_TOKEN,
  DSP_A_HOST,
  DSP_A_URI,
  DSP_B_HOST,
  DSP_B_URI,
  SHOP_HOST,
  NEWS_HOST,
  SSP_C_HOST,
  SSP_D_HOST,
  DSP_C_HOST,
  DSP_C_URI,
  DSP_D_HOST,
  DSP_D_URI,
} = process.env;

const DSP_A = new URL(`https://${DSP_A_HOST}:${EXTERNAL_PORT}`);
const DSP_B = new URL(`https://${DSP_B_HOST}:${EXTERNAL_PORT}`);
const DSP_C = new URL(`https://${DSP_C_HOST}:${EXTERNAL_PORT}`);
const DSP_D = new URL(`https://${DSP_D_HOST}:${EXTERNAL_PORT}`);
const SSP_C = new URL(`https://${SSP_C_HOST}:${EXTERNAL_PORT}`);

const app = express();

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Origin-Trial', SSP_C_TOKEN);
  next();
});

const ALLOWED_HOSTNAMES = [
  DSP_A_HOST,
  DSP_B_HOST,
  DSP_C_HOST,
  DSP_D_HOST,
  DSP_D_HOST,
  DSP_C_HOST,
  SSP_A_HOST,
  SSP_B_HOST,
  SSP_C_HOST,
  SSP_D_HOST,
  NEWS_HOST,
];

app.use((req, res, next) => {
  // opt-in fencedframe
  if (req.get('sec-fetch-dest') === 'fencedframe') {
    res.setHeader('Supports-Loading-Mode', 'fenced-frame');
  }
  if (ALLOWED_HOSTNAMES.includes(req.hostname)) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  next();
});

app.use(
  express.static('src/public', {
    setHeaders: (res, path) => {
      const shouldAddAuctionHeader = [
        'decision-logic.js',
        'trusted.json',
        'direct.json',
      ].some((fileName) => path.includes(fileName));

      if (shouldAddAuctionHeader) {
        return res.set('Ad-Auction-Allowed', 'true');
      }

      if (path.endsWith('/run-ad-auction.js')) {
        res.set('Supports-Loading-Mode', 'fenced-frame');
        res.set('Permissions-Policy', 'run-ad-auction=(*)');
      }
    },
  }),
);

app.set('view engine', 'ejs');
app.set('views', 'src/views');

app.get('/', async (req, res) => {
  const title = SSP_C_DETAIL;
  res.render('index.html.ejs', {
    title,
    DSP_A_HOST,
    DSP_B_HOST,
    DSP_C_HOST,
    DSP_D_HOST,
    SSP_C_HOST,
    EXTERNAL_PORT,
    SHOP_HOST,
  });
});

app.get('/ad-tag.html', async (req, res) => {
  res.render('ad-tag.html.ejs');
});

app.get('/video-ad-tag.html', async (req, res) => {
  res.render('video-ad-tag.html.ejs');
});

async function getHeaderBiddingAd() {
  const headerBids = await Promise.all(
    [`${DSP_A_URI}/header-bid`, `${DSP_B_URI}/header-bid`, `${DSP_C_URI}/header-bid`, `${DSP_D_URI}/header-bid`].map(
      async (dspUrl) => {
        const response = await fetch(dspUrl);
        const result = await response.json();
        return result;
      },
    ),
  );

  const [highestBid] = headerBids.sort((a, b) => b.bid - a.bid);
  return highestBid;
}

function getComponentAuctionConfig() {
  return {
    seller: SSP_C,
    decisionLogicUrl: `${SSP_C}js/decision-logic.js`,
    trustedScoringSignalsURL: `${SSP_C}/signals/trusted.json`,
    directFromSellerSignals: `${SSP_C}/signals/direct.json`,
    interestGroupBuyers: [DSP_A, DSP_B, DSP_C, DSP_D],
    perBuyerSignals: {
      [DSP_A]: {'some-key': 'some-value'},
      [DSP_B]: {'some-key': 'some-value'},
      [DSP_C]: {'some-key': 'some-value'},
      [DSP_D]: {'some-key': 'some-value'},
    },
    // After M123, you will be able to pass in data from the winning SSP to the
    // ad creative using deprecatedReplaceInURN for component sellers:
    // https://github.com/WICG/turtledove/issues/286#issuecomment-1910551260
    //
    // deprecatedReplaceInURN: {
    //   '%%SSP_VAST_URI%%': `${SSP_C}/vast/preroll.xml`,
    // }
  };
}

app.get('/header-bid', async (req, res) => {
  res.json({
    seller: SSP_C,
    headerBiddingAd: await getHeaderBiddingAd(),
    componentAuctionConfig: getComponentAuctionConfig(),
  });
});

async function getAdServerAd() {
  const adServerBids = await Promise.all(
    [`${DSP_A_URI}/ad-server-bid`, `${DSP_B_URI}/ad-server-bid`, `${DSP_C_URI}/ad-server-bid`, `${DSP_D_URI}/ad-server-bid`].map(
      async (dspUrl) => {
        const response = await fetch(dspUrl);
        const result = await response.json();
        return result;
      },
    ),
  );

  const [highestBid] = adServerBids.sort((a, b) => b.bid - a.bid);
  return highestBid;
}

app.get('/ad-server-bid', async (req, res) => {
  res.json({
    seller: SSP_C,
    adServerAd: await getAdServerAd(),
  });
});

// The macros are replaced with the DSP VAST URI and the auction ID
function transformVast(sspVast, dspVastUri, auctionId) {
  const vastWithDspUri = sspVast.replace(
    '%%DSP_VAST_URI%%',
    decodeURIComponent(dspVastUri),
  );
  const vastWithAuctionId = vastWithDspUri.replaceAll(
    '%%AUCTION_ID%%',
    auctionId,
  );

  return vastWithAuctionId;
}

// Responds with the finalized VAST XML that wraps the SSP VAST XML around the DSP VAST URI
app.get('/vast', async (req, res) => {
  const {dspVastUri, auctionId} = req.query;

  const sspVast = await readFile(
    path.resolve(__dirname + '/public/vast/preroll.xml'),
    'utf8',
  );
  const wrappedVast = transformVast(sspVast, dspVastUri, auctionId);

  res.type('application/xml');
  res.send(wrappedVast);
});

app.get('/reporting/:reportType', (req, res) => {
  res.send(200);
});

app.listen(PORT, function () {
  console.log(`Listening on port ${PORT}`);
});
