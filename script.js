function main() {
  let personCount = 2; // define how many submission you want
  formFiller(personCount);
}

function formFiller(personCount) {
  const form = FormApp.openByUrl('https://docs.google.com/forms/d/12JK6qpto4kNvMs-ju7zeIN2syDQRgZZcFqTVYoDIviw/edit');
  // console.log(form.getItems()[6].getType());

  // previous answer for last 5 questions
  let prevAnswer1 = [{
    role: 'model',
    parts: {
      text: `Faster info access`
    }  
  }];

  let prevAnswer2 = [{
    role: 'model',
    parts: {
      text: `Faster info lookup`
    }
  }];

  let prevAnswer3 = [{
    role: 'model',
    parts: {
      text: `Better scheduling and resource allocation`
    }
  }];

  let prevAnswer4 = [{
    role: 'model',
    parts: {
      text: `Clear explanations`
    }
  }];

  let prevAnswer5 = [{
    role: 'model',
    parts: {
      text: `Lower costs and easier to train`
    }
  }];

  // access the previous answer from this array
  const prevAnswers = [
    prevAnswer1,
    prevAnswer2,
    prevAnswer3,
    prevAnswer4,
    prevAnswer5
  ];


  for (let count = 0; count < personCount; count++) {
    let formResponse = form.createResponse();

    // to be used to randomize the person info
    let personInfo = {
      Age: '',
      Education: '',
      Position: '',
      YearsWorking: ''

    };
    
    // loop through demographic questions and multiple choice questions
    for (var i = 0; i < 21; i++){
      if (i === 5) continue; // if pagebreak, go to next page
      
      // get list of choices
      let choices = form.getItems()[i].asMultipleChoiceItem().getChoices();
      let answer;
      // answer with bias towards student for demographic questions (except gender)
      console.log(form.getItems()[i].getTitle());
      switch(form.getItems()[i].getTitle()) {
        case 'Gender':
          answer = choices[Math.floor(Math.random() * (choices.length))].getValue();
          break;
        case 'Age':
          answer = personInfo.Age = getAge(choices);
          break;
        case 'Education':
          answer = personInfo.Education = getEducation(choices, personInfo.Age);
          break;
        case 'Position':
          answer = personInfo.Position = getPosition(choices, personInfo.Age);
          break;
        case 'Years Working Experience':
            answer = personInfo.YearsWorking = getYearsWorking(choices, personInfo.Position);
            break;
          default: // if not demographic questions
            answer = getMultiChoice(choices);
            break;
      }
      let res = form.getItems()[i].asMultipleChoiceItem().createResponse(answer);
      console.log(answer);
      formResponse.withItemResponse(res);
    }

    // use this to add previous answer to chat history
    let prevAnswerCount = 0;

    // last 5 questions
    for (var i = 21; i < 26; i++) {
      while (true) {
        let question = form.getItems()[i].asParagraphTextItem().getTitle();


      
        // llm
        const data = {
          system_instruction: {
            parts: {
              text: "I'm going to give you some survey questions. Follow this rules:\
              1. Do not use markdown\
              2. Do not use list\
              3. Answer in brief and basic 1-2 sentence like average person\
              4. Do not give a full sentence at some times, just the point e.g. 'More faster'\
              5. Leave a sentence without a dot at some times to make it more natural"
            }
          },
          contents: [{
              role: 'user',
              parts: {
                text: `${question}`
              }
            }, 
          ]

        }

        // add previous answer
        for (const ans of prevAnswers[prevAnswerCount]) {
          data.contents = [
            ...data.contents,
            ans
          ];
        }
        // then add instructions
        data.contents = [
            ...data.contents,
            {
              role: 'user',
              parts: {
                text: `You previously answered with that, response with different opinion`
              }
            }
        ]
        

        try {
          const options = {
          method:'post',
          contentType: 'application/json',
          payload: JSON.stringify(data)
          } 

          const llmResponse = UrlFetchApp.fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=AIzaSyBw5LtEThyg9evuKJb_iTtTVyUj8EeUVDs`, options);
          const json = JSON.parse(llmResponse.getContentText());
          const text = json.candidates[0].content.parts[0].text;
          
          // add new answer to previous answers and increment here
          prevAnswers[prevAnswerCount] = [
            ...prevAnswers[prevAnswerCount++],
            {
              role: 'model',
              parts: {
                text: text
              }
            }
          ]

          console.log(question);
          console.log(text);

          // create response from llm response
          let res = form.getItems()[i].asParagraphTextItem().createResponse(text);
          formResponse.withItemResponse(res);
          break; // continue to next loop
        } catch(error) {
          console.error("Error:"+ error);
          console.log("wait for 10 secs");
          Utilities.sleep(10 * 1000);
          // redo this loop by not breaking
        }
      }
      
    }

    formResponse.submit();
  }



  

}

function getAge(choices) {
  const biasIndice = [0, 1]; // 18-24 years old or less than 18 prefereable
  const biasWeight = 0.8; // 80% chances

  let answer;
  if (Math.random() < biasWeight) {
    const biasChoices = biasIndice.map(index => choices[index]);
    answer = biasChoices[Math.floor(Math.random() * (biasChoices.length))].getValue();
  } else {
    // choose other than 18-24
    const otherChoices = choices.filter((_, index) => !biasIndice.includes(index));
    answer = otherChoices[Math.floor(Math.random() * (otherChoices.length))].getValue();
  }
  return answer;
}

function getEducation(choices, age) {
  // bias if 18
  const biasIndice = [0, 1, 2]; // second, preu, deg
  const biasWeight = 1; // 100% chances if ~18 years old

  let answer;
  if ((age.search('18') !== -1) && (Math.random() < biasWeight)) {
    const biasChoices = biasIndice.map(index => choices[index]);
    answer = biasChoices[Math.floor(Math.random() * (biasChoices.length))].getValue();
  } else {
    // choose other than 18-24
    const otherChoices = choices.filter((_, index) => !biasIndice.includes(index));
    answer = otherChoices[Math.floor(Math.random() * (otherChoices.length))].getValue();
  }
  return answer;
}

function getPosition(choices, age) {
  // use bias only if there is 18 in age
  const biasIndex = 2; // student
  const biasWeight = 1; // 100% chances

  let answer;
  if ((age.search('18') !== -1) && (Math.random() < biasWeight)) {
    answer = choices[biasIndex].getValue();
  } else {
    // choose other than degree
    const otherChoices = choices.filter((_, index) => index !== biasIndex);
    answer = otherChoices[Math.floor(Math.random() * (otherChoices.length))].getValue();
  }
  return answer;
}

function getYearsWorking(choices, position) {

  const biasIndice = [0, 1]; // less than 1 & 1-3 years working
  const biasWeight = 1; // 100% chances

  let answer;
  if (position === 'Student' && Math.random() < biasWeight) {
    const biasChoices = biasIndice.map(index => choices[index]);
    answer = biasChoices[Math.floor(Math.random() * (biasChoices.length))].getValue();
  } else {
    const otherChoices = choices.filter((_, index) => !biasIndice.includes(index));
    answer = otherChoices[Math.floor(Math.random() * (otherChoices.length))].getValue();
  }
  return answer;
}

// for normal multi choice question
function getMultiChoice(choices) {
  const biasIndice = [3, 4]; // agree and strongly agree
  const biasWeight = 0.8; // 80% chances

  let answer;
  if (Math.random() < biasWeight) {
    const biasChoices = biasIndice.map(index => choices[index]);
    answer = biasChoices[Math.floor(Math.random() * (biasChoices.length))].getValue();
  } else {
    const otherChoices = choices.filter((_, index) => !biasIndice.includes(index));
    answer = otherChoices[Math.floor(Math.random() * (otherChoices.length))].getValue();
  }
  return answer;
}
