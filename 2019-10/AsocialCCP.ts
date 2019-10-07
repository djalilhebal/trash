// The AsocialCCP app -- 2019-10-07

/*
Problem & Idea
==============
My friends Light and Kokichi described to me the process by which they buy stuff online:
0) Find some junk you wanna buy
1) Contact a dealer on Facebook or by phone to agree on the purchase
2) Pay via CCP
3) Inform the dealer and maybe provide proof (like a photo of the receipt or idk)
4) Finally, the dealer fulfills your request

1) to 3) can and should be automated to get rid of the tedious and unnecessary human interactions... XD

Though there seems to be no straightforward way to accomplish this, we can still use what's available
to implement a general purpose, automated, CCP-based, e-payment platform/app.
"The impossible is possible, all you gotta do is make it so!" -- Kaito Momota.

What's available anyway? When your CCP account get credited, you receive an SMS notification that
contains the exact amount of the transaction.
We can use use this 'exact amount' as a key in our key-value 'Requests' database.
When we receive the key (i.e. payment), we know whom it belongs to, and we carry out the request.

The app must have a reactive user interface (think Meteor) so they can know the status of their requests.

Aaaand life's good.

Example
=======
- I want to buy Danganronpa (https://store.steampowered.com/app/413410/Danganronpa_Trigger_Happy_Havoc)
- originalAmount = 19.99 USD
- convertedAmount = 19.99 * 200 = 3998 -> 4000 DZD (see below)
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
Maybe you we can make requests expire after one day, three days, or a week or whatever.
And, if necessary, ban uncommitted users and spammers' phone numbers.

- ASSUMPTION: You can specify dinar unites when sending money via CCP.

- DISCLAIMER: I have never used CCP though I have an inactive account since 2016.
*/

// The following is a TypeScript-ish pseudo-code. Don't sweat the details!

interface AsocialRequest {
  id: string,
  url: string,
  exactAmount: number,

  mobile: string, // that was used to confirm the request
  confirmed: boolean,
  paid: boolean,

  // for logging purposes maybe
  paymentMessage: object,
  confirmationMessage: object,
}

const pending = new Map<number, AsocialRequest>();

class AsocialCustomer {

  createRequest(url) {
    const originalAmount = getOriginalAmount(url);
    const convertedAmount = roundUp(toDinar(originalAmount));
    const exactAmount = addCode(convertedAmount);
    const req = registerRequest({url, exactAmount});
    confirmRequest(req);
  }

  registerRequest(request) {
    const requestID = await post(DEALER_SERVER, request);
    return { ...request, id: requestID }
  }

  confirmRequest(request) {
    sendSMS(DEALER_NUMBER, `Confirm request ${request.id}`);
  }

  toDinar(x) {
    const DOLLAR = 200; // say DEALER charges 200 DZD for 1 USD (Why? How? DK.)
    return x * DOLLAR;
  }

  // To free up the last two digits which are then used to identify payments of "equal" amounts
  // The added units are used for maintenance/development or to support open source projects or idk
  roundUp(x) {
    return Math.ceil(x / 100) * 100;
  }

  // code 00 is reserved for only-Chihiro-knows-why
  addCode(amount) {
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

  onSMS(message) {
    if (message.sender === CCP_SERVICE) {
      handlePayment(message);
    } else {
      handleConfirmation(message);
    }
  }

  handlePayment(message) {
    const {amount} = parse(message.text); // "... crédité <AMOUNT> ..."
    if (pending.has(amount)) {
      const r = pending.get(amount);
      r.paymentMessage = message;
      r.paid = true;
      automaticallyFulfillRequest(r) || promptDealerToManuallyFulfillRequest(r);
      // moveToArchive(r) // to free the slot
    }
  }

  handleConfirmation(message) {
    const {id} = parse(message.text); // "Confirm request <ID>"
    if (pending.has(id)) {
      const r = pending.get(id);
      r.confirmationMessage = message;
      r.mobile = message.sender;
      r.confirmed = true;
    }
  }

}
