// The AsocialCCP app -- 2019-10-07

/*
Problem & Idea
==============
My friends Light and Kokichi described to me the process by which they buy stuff online:
1) Find some junk you wanna buy
2) Contact a dealer on Facebook or by phone to agree on the purchase
3) Pay via CCP
4) Inform the dealer and maybe provide proof (like a photo of the receipt or idk)
5) Finally, the dealer fulfills your request.

Steps 2) to 5) can and should be automated to get rid of the tedious and unnecessary human interactions... XD

Though there seems to be no straightforward way to accomplish this, we can still use what's available
to implement a general purpose, CCP-based, e-payment platform/app.
"The impossible is possible, all you gotta do is make it so!" -- Kaito Momota.

What's available anyway? When your CCP account gets credited, you receive an SMS notification that
contains the exact amount of the transaction.
We can use this 'exact amount' as a key in our key-value 'Requests' database.
When we receive the key (i.e. payment), we know whom it belongs to, and we carry out the order.

The app must have a reactive user interface (think Meteor) so that users can know the status of their requests.

Aaaand life's good.

Example
=======
- I want to buy Danganronpa (https://store.steampowered.com/app/413410/Danganronpa_Trigger_Happy_Havoc)
- originalAmount = 19.99 USD
- convertedAmount = 19.99 * 200 = 3998 = 4000 DZD (see below)
- exactAmount = 4001 or 4002 or ... 4099 (the last two digits are like an ID)
- The request is confirmed by sending an SMS (from within the app) that contains the 'request id'
- You forward EXACTLY the 'exactAmount' via CCP to DEALER_ACCOUNT
- The DEALER receives an SMS of your transaction and uses its exactAmount to fetch your 'request'
- The request is then realized either automatically/programmatically or manually.

Notes
=====
- Why SMS (phone number)? Za3ma for the sake of *accountability* and lessening spam.

- Up to 99 request of the same amount can be pending at any given time.
Not enough? Shut up!
Maybe you can make requests expire after one day, two days, or whatever suits your business.
And, if necessary, ban uncommitted users and spammers' phone numbers.

- It's an unfair system! Why do I have to pay for more just because I came in late?
That's a valid point.
Just saying: In the worst case scenario, you'll be paying an extra 198 DZD because of how
this system works (501 -> 600 -> 699).
So maybe instead of rounding up, I should just round *down* or to the nearest hundred?

- What happens to those extra dinars?
  - Think of them as processing fees.
  - They are used for maintenance/development of the platform.
  - Will be used to for charity or to support open source projects on transparent, Patreon-like websites.

- ASSUMPTION: You can specify dinar unites when sending money via CCP.

- DISCLAIMER: I have never used CCP though I have an inactive account since 2016.
*/

// The following is a TypeScript-ish pseudo-code. Don't sweat the details!

interface AsocialRequest {
  id: string,
  url: string,
  details: any, // e.g. Steam user to send the game to.
  exactAmount: number,

  mobile: string, // that was used to confirm the request
  confirmed: boolean,
  paid: boolean,

  // for logging purposes maybe
  creationDate: Date, // the date this request was created (via POST)
  confirmationMessage: object,
  paymentMessage: object,
}

const pending = new Map<number, AsocialRequest>();

class AsocialCustomer {

  createRequest() {
    const {url, details} = getInputs(); // from a graphical Amazon/Fiverr-like UI
    const originalAmount = getOriginalAmount(url);
    const convertedAmount = roundUp(toDinar(originalAmount));
    const exactAmount = addCode(convertedAmount);
    const req = registerRequest({url, details, exactAmount});
    confirmRequest(req);
  }

  registerRequest(request: AsocialRequest) {
    const requestID = await post(DEALER_SERVER, request);
    return { ...request, id: requestID }
  }

  confirmRequest(request: AsocialRequest) {
    sendSMS(DEALER_NUMBER, `Confirm request ${request.id}`);
  }

  toDinar(x: number) {
    const DOLLAR = 200; // say DEALER charges 200 DZD for 1 USD
    return x * DOLLAR;
  }

  // To free up the last two digits which are then used to identify payments of "equal" amounts
  roundUp(x: number) {
    return Math.ceil(x / 100) * 100;
  }

  // code 00 is reserved for only-Chihiro-knows-why
  addCode(amount: number) {
    for (let code = 01; code <= 99; code++) {
      const fullcode = amount + code;
      if (isFreeSlot(fullcode)) {
        return fullcode;
      }
    }
    throw new Error('Server has reached its limit'); // Try again later?
  }

}

class AsocialDealer {

  onSMS(message: object) {
    if (message.sender === CCP_SERVICE) {
      handlePayment(message);
    } else {
      handleConfirmation(message);
    }
  }

  handleConfirmation(message: object) {
    const {id} = parse(message.text); // "Confirm request <ID>"
    const r = pending.get(id);
    r.confirmationMessage = message;
    r.mobile = message.sender;
    r.confirmed = true;
  }

  handlePayment(message: object) {
    const {amount} = parse(message.text); // "... crédité <AMOUNT> ..."
    if (pending.has(amount)) {
      const r = pending.get(amount);
      r.paymentMessage = message;
      r.paid = true;
      automaticallyFulfillRequest(r) || promptDealerToManuallyFulfillRequest(r);
      archiveRequest(r); // to free the slot
    }
  }

  // An example of an automated 'fulfilment' using a fictional (or is it?) SteamStore API
  // DISCLAIMER: I've never bought anything from Steam before
  fulfillSteam(r: AsocialRequest) {
    const {url, details} = r;
    const steam = new SteamStore(DEALER_CREDENTIALS);
    const game = steam.buyAsGift(url);
    game.giftTo(details.targetUser);
  }

}
