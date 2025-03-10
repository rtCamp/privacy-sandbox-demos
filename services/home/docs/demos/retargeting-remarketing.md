---
title: Retargeting / Remarketing
sidebar_position: 6
more_data:
  - apis:
      - Protected Audience API
  - parties:
      - Publisher
      - SSP
      - Advertiser
      - DSP
---

import Tabs from '@theme/Tabs'; import TabItem from '@theme/TabItem';

# Retargeting / Remarketing

<Tabs>
<TabItem value="overview" label="Overview" default>

## Overview

### Description

Remarketing is a type of online advertising that allows you to show ads to people who have already visited your website. You can create custom
audiences based on different criteria, such as pages visited or products added to the cart. Remarketing can help you increase brand awareness, drive
traffic back to your website, and boost sales.

### Privacy Sandbox APIs

- [Protected Audience API](https://developer.chrome.com/docs/privacy-sandbox/protected-audience/)

### Related parties

- Publisher
- SSP
- Advertiser
- DSP

</TabItem>
<TabItem value="scope" label="Scope">

## Scope

### Goals

In this demo, we assume an advertiser would like to drive traffic back to their website. Remarketing can help an advertiser to get people who have
already visited their website to come back for more or to complete a purchase. This can be done by showing them ads about the product they have
previously looked at, on other websites.

### Assumptions

This use case assumes the advertiser (shop site) can bid on the publisher (news site) inventory through an agreement between their respective DSP and
SSP platforms.

### Key Exclusions

The demo does not integrate existing auction mechanisms (prebid or header bidding…). it is only scoped to on-device auction with Protected Audience
API. The ad selection is very straightforward (only 1 bidder). The bidding logic does not include real-time signals from Key/Value service.

### System Design

Using Protected Audience API, the user visits a shopping site, and gets added to an interest group. Later the same user visits a news site. There the
browser runs an on-device Auction, bidding logic will select the winning interest group, and relevant ads will be dynamically rendered on the
publisher page.

#### Protected Audience Flow

Below is a general introduction of Remarketing using Privacy Sandbox Protected Audience API. For further information see
[Protected Audience API - Chrome Developers](https://developer.chrome.com/docs/privacy-sandbox/protected-audience/#overview).

![Protected Audience Flow](./img/retargeting-remarketing-flow.png)

#### User Journey #1

<!--
![Remarketing User Journey 1](./img/retargeting-remarketing-journey-1-seq.png)
-->

```mermaid
sequenceDiagram
Title: Retargeting / Remarketing - User Journey 1

participant Browser
participant Publisher
participant SSP
participant Advertiser
participant DSP

Browser->>Advertiser:visits a shop site and reviews products
Advertiser-->>Browser:return DSP tags
Browser->>DSP:browser loads scripts from DSP
DSP-->>Browser:returns interest group configuration

Browser-)Browser:navigator.joinAdInterestGroup(...)

Browser->>Publisher:visits a news  site
Publisher-->>Browser:return SSP tags
Browser->>SSP:browser loads scripts from SSP
SSP-->>Browser:returns auction configuration

Browser-)Browser:navigator.runAdAuction(auctionConfig)

note right of Browser:each interest group's bidding function will run
Browser-)Browser:generateBid(...)

note right of Browser:for each candidate ad in the auction
Browser-)Browser:scoreAd(...)

note right of Browser:Winning ad is displayed in a fenced-frame
Browser->>DSP:Request ad creative
DSP-->>Browser:Return ad creative

Note right of Browser:Scenario 1 stops here

```

</TabItem>
<TabItem value="demo" label="Demo">

## Demo

### Prerequisites

- Chrome > v107 (Open chrome://version to look up your current version)
- Enable Privacy Sandbox APIs (Open chrome://settings/privacySandbox to enable this setting)
- Clear your browsing history before you run one of the demo scenario below (Open chrome://settings/clearBrowserData to delete your browsing history)

### User Journey #1

1. <a href="https://privacy-sandbox-demos-shop.dev/">Navigate to shop site</a> (advertiser)
2. Click on a “shoe” product item on the shop site.
   - The shop (advertiser) would assume the user is interested in this type of product, so they would leverage Protected Audience API and ask the
     browser to join an ad interest group for this product or this specific product category.
3. <a href="https://privacy-sandbox-demos-news.dev/">Navigate to the news site</a> (publisher)
4. Observe the ad served on the news site
   - If you previously browsed the “shoe” product on the shop site, you will be shown an ad for the same product.
   - When the page was loaded, Protected Audience API allowed the SSP to run an ad auction on the publisher site.
   - The winning advertiser of this ad auction gets their ad creative to be displayed on the publisher site. In this case you have cleared the browser
     history and only browsed 1 advertiser site page so you are only seeing 1 ad creative from the same advertiser.

### Implementation details

#### How is the user added to an Interest Group based on his browsing behavior ? (see step #2 of User Journey)

The shop product page
[includes dsp-tag.js](https://github.com/privacysandbox/privacy-sandbox-demos/blob/939dd4928ec9cb4628b3f9424081bbd912346bcf/services/shop/src/index.ts#L93)
from the DSP service. This is a third-party tag from the DSP service.

```html
<script
  src="https://privacy-sandbox-demos-dsp.dev/dsp-tag.js"
  class="dsp_tag"
  data-advertiser="privacy-sandbox-demos-shop.dev"
  data-id="1f45e"
></script>
```

The
[dsp-tags.js](https://github.com/privacysandbox/privacy-sandbox-demos/blob/939dd4928ec9cb4628b3f9424081bbd912346bcf/services/dsp/src/public/dsp-tag.js#L17)
dynamically embeds an iframe

```html
<iframe
  width="1"
  height="1"
  src="https://privacy-sandbox-demos-dsp.dev/join-ad-interest-group.html?advertiser=privacy-sandbox-demos-shop.dev&amp;id=1f45e"
  allow="join-ad-interest-group"
></iframe>
```

The iframe calls a third-party script
[join-ad-interest-group.js](https://github.com/privacysandbox/privacy-sandbox-demos/blob/939dd4928ec9cb4628b3f9424081bbd912346bcf/services/dsp/src/public/js/join-ad-interest-group.js#L31)
to join interest group using Protected Audience API

```js title="https://github.com/privacysandbox/privacy-sandbox-demos/blob/main/services/dsp/src/public/js/join-ad-interest-group.js"
// Protected Audience API
async function getInterestGroupFromServer() {
  const currentUrl = new URL(location.href)
  const interestGroupUrl = new URL(location.origin)
  interestGroupUrl.pathname = "/interest-group.json"
  for (const searchParam of currentUrl.searchParams) {
    interestGroupUrl.searchParams.append(searchParam[0], searchParam[1])
  }
  const res = await fetch(interestGroupUrl)
  if (res.ok) {
    return res.json()
  }
}

document.addEventListener("DOMContentLoaded", async (e) => {
  if (navigator.joinAdInterestGroup === undefined) {
    return console.log("[DEMO] Protected Audience API is not supported")
  }
  const interestGroup = await getInterestGroupFromServer()
  console.log(`[DEMO] ${{ interestGroup }}`)
  const kSecsPerDay = 3600 * 24 * 30
  console.log(await navigator.joinAdInterestGroup(interestGroup, kSecsPerDay))
})
```

This code sets up the interest groups options. Those options are fetched dynamically from
[interest-group.json](https://github.com/privacysandbox/privacy-sandbox-demos/blob/939dd4928ec9cb4628b3f9424081bbd912346bcf/services/dsp/src/index.ts#L50).
Finally the code requests the browser to
[join the interest group](https://github.com/privacysandbox/privacy-sandbox-demos/blob/939dd4928ec9cb4628b3f9424081bbd912346bcf/services/dsp/src/public/js/join-ad-interest-group.js#L38)

#### How do we serve an ad relevant to the user’s interest ? (see step #4 of User Journey)

The news page
[includes ad-tag.js](https://github.com/privacysandbox/privacy-sandbox-demos/blob/8a33afb7433ed70e639047316c5bff30d61be58b/services/news/src/views/index.ejs#L29)from
the SSP service. This is a third-party tag from the SSP service.

```html
<script defer="" class="ssp_tag" src="https://privacy-sandbox-demos-ssp.dev/ad-tag.js"></script>
```

This [ssp-tags.js](https://github.com/privacysandbox/privacy-sandbox-demos/blob/main/services/ssp/src/public/ad-tag.js) dynamically embeds an iframe.

```html
<iframe
  width="300"
  height="250"
  src="https://privacy-sandbox-demos-ssp.dev/ad-tag.html"
  scrolling="no"
  style="border: none"
  allow="attribution-reporting; run-ad-auction"
></iframe>
```

The iframe calls a third-party script
[run-ad-auction.js](https://github.com/privacysandbox/privacy-sandbox-demos/blob/main/services/ssp/src/public/js/run-ad-auction.js) to run an ondevice
ad auction using Protected Audience API

```js title=”https://github.com/privacysandbox/privacy-sandbox-demos/blob/main/services/ssp/src/public/js/run-ad-auction.js”
document.addEventListener("DOMContentLoaded", async (e) => {
  const auctionConfig = await getAuctionConfig()

  // Running Ad Auction
  const adAuctionResult = await navigator.runAdAuction(auctionConfig)

  // Display selected Ads
  const $fencedframe = document.createElement("fencedframe")
  $fencedframe.config = adAuctionResult
  $fencedframe.setAttribute("mode", "opaque-ads")
  $fencedframe.setAttribute("scrolling", "no")
  $fencedframe.width = 300
  $fencedframe.height = 250
  document.body.appendChild($fencedframe)
})
```

The `runAdAuction` code is executed by the browser and will decide which ad will be served to the user. The result of the auction is displayed within
a Fenced Frame by specifying the adAuctionResult object to the fenced frame configuration. Developers would traditionally use https urls to load
creative in an iframe, however Protected Audience API is hiding the creative url from the parent page. This is a privacy protection mechanism to not
reveal the user's interest to the parent page.

```html
<fencedframe mode="opaque-ads" scrolling="no" width="300" height="250">
  <html lang="en">
    …
  </html>
</fencedframe>
```

note that Fenced Frame attribute `mode` must be set to
“[opaque-ads](https://github.com/WICG/fenced-frame/blob/master/explainer/use_cases.md#opaque-ads)” to make the url opaque to the embedding context.
Fenced Frame size (width and height) only allow pre-defined values, please refer to the allow-list from the documentation. The request to the
`renderURL`from the winning Interest Group
[returns the ad creative](https://github.com/privacysandbox/privacy-sandbox-demos/blob/9f8578e6d99da4dd52007843a283c97885c07146/services/dsp/src/index.ts#L57)
to be displayed

```html
<body>
  <a
    width="300"
    height="250"
    target="_self"
    rel="noopener noreferrer"
    attributionsrc="https://privacy-sandbox-demos-dsp.dev/register-source?advertiser=privacy-sandbox-demos-shop.dev&amp;id=1fa70"
    href="https://privacy-sandbox-demos-shop.dev/items/1fa70"
  >
    <!-- smaller for avoid scrollbar -->
    <img
      width="294"
      height="245"
      loading="lazy"
      attributionsrc="https://privacy-sandbox-demos-dsp.dev/register-source?advertiser=privacy-sandbox-demos-shop.dev&amp;id=1fa70"
      src="https://privacy-sandbox-demos-shop.dev/ads/1fa70"
    />
  </a>
</body>
```

This code contains the `img` tag with `src` attribute specifying the product the user might be interested in, and a link “href” pointing to the
advertiser page.

### Related API documentation

- [Protected Audience API - Chrome Developers](https://developer.chrome.com/docs/privacy-sandbox/protected-audience/)
- [Protected Audience API: developer guide](https://developer.chrome.com/docs/privacy-sandbox/protected-audience-api/)

</TabItem>
</Tabs>
