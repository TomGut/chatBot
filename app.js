/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 */

'use strict';

const bodyParser = require('body-parser');
const crypto = require('crypto');
const express = require('express');
const fetch = require('node-fetch');

let Wit = null;
let log = null;

  Wit = require('node-wit').Wit;
  log = require('node-wit').log;

// Webserver parameter
const PORT = process.env.PORT || 8445;

// Wit.ai parameters
const WIT_TOKEN = process.env.WIT_TOKEN || 'R5V774BP5QAS4R37T6NLS3H4SKUP4NOT';

// Messenger API parameters
const FB_PAGE_TOKEN = process.env.FB_PAGE_TOKEN || 'EAAZA0ufyLoHQBADkuss9Gy5cfMV4SsyGQjskl1iO6VYPoiQhRs8a0JGUgSkgiO9HvshjrOR8qrdQJybnIymHG3gmIcsDMVuNsAAwUASVB27ZAFIHQZCIQubbDyOEmKoB4YDkOWGv3PKAPsM0YRIykJqUGDxgGNW7VgHJBb84XV63mIqzT81';

if (!FB_PAGE_TOKEN) { throw new Error('missing FB_PAGE_TOKEN') }

const FB_APP_SECRET = process.env.FB_APP_SECRET || '9643f232120c33746fc28b76463d41bc';

if (!FB_APP_SECRET) { throw new Error('missing FB_APP_SECRET') }

let FB_VERIFY_TOKEN = 'bot_page';

crypto.randomBytes(8, (err, buff) => {
  if (err) throw err;
  FB_VERIFY_TOKEN = buff.toString('hex');
  console.log(`/webhook will accept the Verify Token "${FB_VERIFY_TOKEN}"`);
});

// ----------------------------------------------------------------------------
// Messenger API specific code

// See the Send API reference
// https://developers.facebook.com/docs/messenger-platform/send-api-reference

const fbMessage = (id, text) => {
  const body = JSON.stringify({
    recipient: { id },
    message: { text },
  });
  const qs = 'access_token=' + encodeURIComponent(FB_PAGE_TOKEN);
  return fetch('https://graph.facebook.com/me/messages?' + qs, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body,
  })
  .then(rsp => rsp.json())
  .then(json => {
    if (json.error && json.error.message) {
      throw new Error(json.error.message);
    }
    return json;
  });
};

// typing bubble
const typingBubbleStart = (id, text) => {

  const body = JSON.stringify({
      recipient: { id },
      "sender_action":"typing_on"
  });

  const qs = 'access_token=' + encodeURIComponent(FB_PAGE_TOKEN);
  return fetch('https://graph.facebook.com/me/messages?' + qs, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body,
  })
  .then(rsp => rsp.json())
  .then(json => {
    if (json.error && json.error.message) {
      throw new Error(json.error.message);
    }
    return json;
  });
};

const typingBubbleStop = (id, text) => {

  const body = JSON.stringify({
      recipient: { id },
      "sender_action":"typing_off"
  });

  const qs = 'access_token=' + encodeURIComponent(FB_PAGE_TOKEN);
  return fetch('https://graph.facebook.com/me/messages?' + qs, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body,
  })
  .then(rsp => rsp.json())
  .then(json => {
    if (json.error && json.error.message) {
      throw new Error(json.error.message);
    }
    return json;
  });
};

//get started button
const getStartedButton = (id, text) => {

  const body = JSON.stringify({
  "get_started":{
     "payload":"text"
   }
  });

  const qs = 'access_token=' + encodeURIComponent(FB_PAGE_TOKEN);
  return fetch('https://graph.facebook.com/me/messages?' + qs, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body,
  })
  .then(rsp => rsp.json())
  .then(json => {
    if (json.error && json.error.message) {
      throw new Error(json.error.message);
    }
    return json;
  });
};

// ----------------------------------------------------------------------------
// Wit.ai bot specific code

// This will contain all user sessions.
// Each session has an entry:
// sessionId -> {fbid: facebookUserId, context: sessionState}
const sessions = {};

const findOrCreateSession = (fbid) => {
  let sessionId;
  // Let's see if we already have a session for the user fbid
  Object.keys(sessions).forEach(k => {
    if (sessions[k].fbid === fbid) {
      // Yep, got it!
      sessionId = k;
    }
  });
  if (!sessionId) {
    // No session found for user fbid, let's create a new one
    sessionId = new Date().toISOString();
    sessions[sessionId] = {fbid: fbid, context: {}};
  }
  return sessionId;
};

// Setting up our bot
const wit = new Wit({
  accessToken: WIT_TOKEN,
  logger: new log.Logger(log.INFO)
});

// Starting our webserver and putting it all together
const app = express();

app.use(({method, url}, rsp, next) => {
  rsp.on('finish', () => {
    console.log(`${rsp.statusCode} ${method} ${url}`);
  });
  next();
});

app.use(bodyParser.json({ verify: verifyRequestSignature }));

//Serwer setup
app.get('/', (req, res) => {
    res.send("DEPLOYED");
});

// Webhook setup
app.get('/webhook', (req, res) => {
  if (req.query['hub.mode'] === 'subscribe' &&
    req.query['hub.verify_token'] === 'bot_page') {
    res.send(req.query['hub.challenge']);
  } else {
    res.sendStatus(400);
  }
});

// Message handler
app.post('/webhook', (req, res) => {
  // Parse the Messenger payload
  // See the Webhook reference
  // https://developers.facebook.com/docs/messenger-platform/webhook-reference
  const data = req.body;

  if (data.object === 'page') {
      
      getStartedButton(sender,`Witam Cię, jestem chatbotem Etechniki i spróbuję odpowiedzieć na Twoje pytania jak najlepiej potrafię. Zatem - w czym mogę Ci pomóc ?`);
      
    data.entry.forEach(entry => {
      entry.messaging.forEach(event => {
        if (event.message && !event.message.is_echo) {
          // Yay! We got a new message!
          // We retrieve the Facebook user ID of the sender
          const sender = event.sender.id;

          // We could retrieve the user's current session, or create one if it doesn't exist
          // This is useful if we want our bot to figure out the conversation history
          const sessionId = findOrCreateSession(sender);

          // We retrieve the message content
          const {text, attachments} = event.message;
          
          // calling out typingBubble for sender (bot) responding
          typingBubbleStart(sender)
       
          if (attachments) {
            // We received an attachment
            // Let's reply with an automatic message
            fbMessage(sender, 'Sorry I can only process text messages for now.')
            .catch(console.error);
          } else if (text) {
            // We received a text message
            // Let's run /message on the text to extract some entities
            
            //start sending answer after some time to enable typing bubble
            setTimeout(witResponse, 3000);
              
            function witResponse(){
                
                //stopping typing bubble when text message sent by bot after setTimeout
                typingBubbleStop(sender);
                
                wit.message(text).then(({entities}) => {
              // custom answers in responce for entity type
                
                const intent = entities.intent[0].value;
                
                switch(intent) {
                    case "greeting":
                      fbMessage(sender, `Witam Cię, jestem chatbotem Etechniki i spróbuję odpowiedzieć na Twoje pytania jak najlepiej potrafię. Zatem - w czym mogę Ci pomóc ?`);
                      break;
                    case "goodbye":
                      fbMessage(sender, `To do usłyszenia :) odwiedź nas jeszcze czasem.`);
                      break;
                    case "question":
                      fbMessage(sender, `Oczywiście, w czym mogę pomóc ?`);
                      break;
                    case "whats_up":
                      fbMessage(sender, `W porządku dzięki :) Co mogę dla Ciebie zrobić ?`);
                      break;
                    case "thanks":
                      fbMessage(sender, `Nie ma problemu, cieszę się, że mogłem pomóc :)`);
                      break;
                    case "contacted":
                      fbMessage(sender, `Możesz się z nami skontaktować w godzinach od 8 do 16 pod nr tel. 516 141 949 lub mailowo kontakt@etechnika.com.pl .Sporo informacj znajdziesz też na naszej stronie w strefie kursów: https://www.etechnika.com.pl/SZKOLENIA_I_USLUGI `);
                      break;
                    case "happy":
                      fbMessage(sender, `Cieszę się z Tobą :)`);
                      break;
                    case "book_get_price":
                      fbMessage(sender, `Książka kosztuje 50 pln '(płatność przelewem)' i jest wysyłana mailowo w formacie PDF. Szczegóły o książce znajdziesz na naszej stronie pod tym linkiem: https://www.etechnika.com.pl/ksiazka-rysunek-izometryczny . Po więcej informacji zapraszamy na mail kontakt@etechnika.com.pl`);
                      break;
                    case "drawing_get_price":
                      fbMessage(sender, `Kurs rysunku izometrycznego kosztuje 400 PLN, trwa 1 dzień (4 do 5h zależnie od liczebności grupy). Kurs rysunku izometrycznego organizujemy stacjonarnie w Gdańsku lub Gdyni - zależnie od liczebności grupy. Kurs kończy się certyfikatami w 4 językach (PL, EN, DE i NO). Szerszy opis znajdziesz na naszej stronie, pod tym linkiem: https://www.etechnika.com.pl/Rysunek_Izometryczny_Stacjonarny_2 . Po więcej informacji zapraszamy na mail kontakt@etechnika.com.pl`);
                      break;
                    case "hotWork_get_price":
                      fbMessage(sender, `Kurs Hot Work, elearnigowy (na komputerze kupującego), kosztuje 1000 PLN, trwa około 3 godzin i kończy się certyfikatem Norweskim. Więcej informacji znajdziesz na naszej stronie pod tym linkiem: https://www.etechnika.com.pl/Hot_Work_elearning`);
                      break;
                    case "book_get_ebook":
                      fbMessage(sender, `Książka jest w formacie Ebooka (PDF), wysyłamy ją emailowo - po szczegoły zapraszamy na mail kontakt@etechnika.com.pl`);
                      break;
                    case "drawing_get_date":
                      fbMessage(sender, `W celu ustalenia dat kursu z rysunku izometrycznego, proszę kontaktować się z nami pod numerem tel 516 141 949 lub mailowo kontakt@etechnika.com.pl`);
                      break;
                    case "hotWork_get_date":
                      fbMessage(sender, `W celu ustalenia dat rozpoczęcia kursu, proszę kontaktować się z nami pod numerem tel 516 141 949 lub mailowo kontakt@etechnika.com.pl`);
                      break;
                    case "offer":
                      fbMessage(sender, `W naszej ofercie znajdują się na przykład: książka o rysunku izometrycznym, szkolenie z rysunku izometrycznego, kurs Hot Work. Jeżeli interesuje Cię coś konkretnego to śmialo pytaj o datę/ cenę :). Dodatkowe informacje znajdziesz w cenniku na naszej stronie: https://www.etechnika.com.pl/CENNIK`);
                      break;
                    case "confirm":
                      fbMessage(sender, `Ok - co robimy dalej ?`);
                      break;
                    case "negation":
                      fbMessage(sender, `Ok w takim razie co mogę jeszcze dla Ciebie zrobić ?`);
                      break;
                    case "outh":
                      fbMessage(sender, `Przepraszam ale nie rozumiem - możesz to ująć inaczej ?`);
                      break;
                    case "swear":
                      fbMessage(sender, `Proszę nie używaj takich słów... powiedz lepiej w czym mogę Ci jeszcze pomóc ?`);
                      break;
                        
                    default: // Any other intensions go here..
                      sendTextMessage(sender, "Przepraszam ale nie rozumiem - możesz to ująć inaczej ?")
                      break;
                }
                
              console.log(entities);
              
            })
            .catch((err) => {
              console.error('Oops! Got an error from Wit: ', err.stack || err);
            })
          };}
        } else {
          console.log('received event', JSON.stringify(event));
        }
      });
    });
  }
  res.sendStatus(200);
});

/*
 * Verify that the callback came from Facebook. Using the App Secret from
 * the App Dashboard, we can verify the signature that is sent with each
 * callback in the x-hub-signature field, located in the header.
 *
 * https://developers.facebook.com/docs/graph-api/webhooks#setup
 *
 */
function verifyRequestSignature(req, res, buf) {
  var signature = req.headers["x-hub-signature"];
  console.log(signature);

  if (!signature) {
    // For testing, let's log an error. In production, you should throw an
    // error.
    console.error("Couldn't validate the signature.");
  } else {
    var elements = signature.split('=');
    var method = elements[0];
    var signatureHash = elements[1];

    var expectedHash = crypto.createHmac('sha1', FB_APP_SECRET)
                        .update(buf)
                        .digest('hex');

    if (signatureHash != expectedHash) {
      throw new Error("Couldn't validate the request signature.");
    }
  }
}

app.listen(PORT);
console.log('Listening on :' + PORT + '...');