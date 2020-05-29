/* eslint-disable  func-names */
/* eslint-disable  no-console */

const Alexa = require('ask-sdk-core');
const persistenceAdapter = require('ask-sdk-s3-persistence-adapter');

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speakOutput = `Hello! Welcome to Covid Tracker! Please say a name of a country you would like to know more information about!`;
        const repromptText = 'You can say any country that you want! You may have said something that I do not recognize as a country.';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(repromptText)
            .getResponse();
    }
}; 

const HasCountryLaunchRequestHandler = {
    canHandle(handlerInput) {

        const attributesManager = handlerInput.attributesManager;
        const sessionAttributes = attributesManager.getSessionAttributes() || {};

        const country = sessionAttributes.hasOwnProperty('country') ? sessionAttributes.country : "";

        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest'

            && country;
    },
    handle(handlerInput) {

        const attributesManager = handlerInput.attributesManager;
        const sessionAttributes = attributesManager.getSessionAttributes() || {};

        const country = sessionAttributes.hasOwnProperty('country') ? sessionAttributes.country : "";

        // TODO:: Use the settings API to get current date and then compute how many days until user's birthday
        // TODO:: Say Happy birthday on the user's birthday

        const speakOutput = `Welcome back. What country do you want to look at?`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt('Any country you want to look at?')
            .getResponse();
    }
};


const CaptureCountryIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'CaptureCountryIntent';
  },
  async handle(handlerInput) {
    let country = handlerInput.requestEnvelope.request.intent.slots.country.value;  
    
    let outputSpeech = `If you get this response, I was not able to format your country to match what the API object wants. However, you chose ${country}`;
    
    let arr = country.split('');
    
    for(let i = 0; i < arr.length; i++) {
        if(i === 0){
            arr[i] = arr[i].toUpperCase();
        }
        if(arr[i] === ' ') {
            if(i + 1 < arr.length && arr[i + 1] === 'a') {
               if(i + 2 < arr.length && arr[i + 2] === 'n') {
                  if(i + 3 < arr.length && arr[i + 3] === 'd') {
                    i = i + 5;
                  }
               } 
            }
            else {
                arr[i + 1] = arr[i + 1].toUpperCase();
            }
        }
    }
    
    country = arr.join("");
    
    if(country === "United States" || country === "US" || country === "USA") {
        country = "US";
    }
    if(country === "ms zaandam") {
        country = "MS Zaandam";
    }
    if(country === "Congo") {
        outputSpeech = "You will have to specify either Congo (Brazzaville) or Congo (Kinshasa). Just Congo is not enough information for the API."
    }
    if(country === "guinea-bissau") {
        country = "Guinea-Bissau";
    }
    
    const attributesManager = handlerInput.attributesManager;
    
    const countryAttributes = {
        "country": country
    };
    
    attributesManager.setPersistentAttributes(countryAttributes);
    
    await attributesManager.savePersistentAttributes();
    
    await getRemoteData('https://pomber.github.io/covid19/timeseries.json')
      .then((response) => {
        const data = JSON.parse(response);
        
        let specificCountry = data[country];
        let index = data[country].length - 1;
        outputSpeech = `You chose ${country}. The total number of confirmed cases as of ${specificCountry[index].date} in ${country} is ${specificCountry[index].confirmed} cases.
              The total number of deaths in ${country} is ${specificCountry[index].deaths}, and the total number of recovered cases in ${country} is ${specificCountry[index].recovered}.
              Feel free to name another country you want information on.`;
      })
      .catch((err) => {
        //set an optional error message here
        //outputSpeech = err.message;
      });

    return handlerInput.responseBuilder
      .speak(outputSpeech)
      .reprompt("Let me know if there is another country you want to search.")
      .getResponse();

  },
};

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const speechText = 'You can introduce yourself by telling me your name';

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .getResponse();
  },
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
        || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    const speechText = 'Hope to see you another time! Bye!';

    return handlerInput.responseBuilder
      .speak(speechText)
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);

    return handlerInput.responseBuilder.getResponse();
  },
};

// The intent reflector is used for interaction model testing and debugging.
// It will simply repeat the intent the user said. You can create custom handlers
// for your intents by defining them above, then also adding them to the request
// handler chain below.
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = handlerInput.requestEnvelope.request.intent.name;
        const speakOutput = `You just triggered ${intentName}`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};

// Generic error handling to capture any syntax or routing errors. If you receive an error
// stating the request handler chain is not found, you have not implemented a handler for
// the intent being invoked or included it in the skill builder below.
const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);

    return handlerInput.responseBuilder
      .speak('Sorry, I can\'t understand the command. Please say again.')
      .reprompt('Sorry, I can\'t understand the command. Please say again.')
      .getResponse();
  },
};

const getRemoteData = function (url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? require('https') : require('http');
    const request = client.get(url, (response) => {
      if (response.statusCode < 200 || response.statusCode > 299) {
        reject(new Error('Failed with status code: ' + response.statusCode));
      }
      const body = [];
      response.on('data', (chunk) => body.push(chunk));
      response.on('end', () => resolve(body.join('')));
    });
    request.on('error', (err) => reject(err))
  })
};

const LoadCountryInterceptor = {
    async process(handlerInput) {
        const attributesManager = handlerInput.attributesManager;
        const sessionAttributes = await attributesManager.getPersistentAttributes() || {};
        
        const country = sessionAttributes.hasOwnProperty('country') ? sessionAttributes.country : "";
        console.log("in intereceptor");
        if (country) {
            attributesManager.setSessionAttributes(sessionAttributes);
        }
    }
}

const skillBuilder = Alexa.SkillBuilders.custom();

exports.handler = skillBuilder
    .withPersistenceAdapter(
        new persistenceAdapter.S3PersistenceAdapter({bucketName:process.env.S3_PERSISTENCE_BUCKET})
    )
  .addRequestHandlers(
    HasCountryLaunchRequestHandler,
    LaunchRequestHandler,
    CaptureCountryIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler, 
    IntentReflectorHandler // make sure IntentReflectorHandler is last so it doesn't override your custom intent handlers
  )
  .addRequestInterceptors(
    LoadCountryInterceptor
   )
  .addErrorHandlers(ErrorHandler)
  .lambda();

