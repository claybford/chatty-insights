//--- Hooks for the transcript file choosing buttons and file management --------------//

let files = [];

document.getElementById('choose-files').addEventListener('click', function () {
    files = [];

    document.getElementById('transcript-files').click(); // Simulate click on the hidden file input
}, false);

document.getElementById('sample-files').addEventListener('click', function () {
    fetch('sample-files.json')
        .then(response => response.json())
        .then(data => {
            // Clear the existing files array
            files = [];

            // Convert the JSON data to File objects and add to files array
            for (const [fileName, content] of Object.entries(data)) {
                const file = new File([content], fileName, { type: "text/plain" });
                files.push(file);
            }

            // Update the UI with the new files
            filesUpdated(files);
        })
        .catch(error => console.error('Error loading JSON:', error));
}, false);

document.getElementById('transcript-files').addEventListener('change', function () {
    filesUpdated(this.files);
}, false);

function filesUpdated(updatedFiles) {
    if (updatedFiles) {
        files = updatedFiles; // Update files with the provided array
    }
    var filesDisplay = document.getElementById('file-list');
    filesDisplay.textContent = "";
    for (var i = 0; i < files.length; i++) {
        filesDisplay.textContent += (files[i].name + "\n"); // You can process each file here
    }
    checkChat();
}

//helper function to read the files, used in the processing of them later on
function readFileContents(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = function (event) {
            resolve(event.target.result);
        };

        reader.onerror = function (event) {
            reject("File could not be read: " + event.target.error);
        };

        reader.readAsText(file);
    });
}


//--- initialize and manage the prompt input box --------------------------------------//

const prompt = document.getElementById('prompt-text');
const defaultPrompt = "Build a summary of the user in this transcript as follows:\n1. Describe a banana in the voice of the user, mimicking their speech in the transcript\n2. Main personality attributes\n3. Other objective descriptive information\n4. Other subjective descriptive information\n5. Likes\n6. Dislikes\n7. Notable personal experiences(enumerate, do not combine these) \n8. Notable personal circumstances(enumerate, do not combine these) \n9. Defining perspectives\n10. Life story of the user, told in the voice of the user, mimicking their speech in the transcript\n11. An overall summary of the interview\n12. Memorable quotes from the transcript\n13. Key insights from the interview";
prompt.value = defaultPrompt;

function adjustTextareaHeight(x) {
    x.style.height = 'auto';
    x.style.height = (x.scrollHeight + 5) + 'px';
}

prompt.addEventListener('input', function () {
    adjustTextareaHeight(this);
});

adjustTextareaHeight(prompt);

document.getElementById('reset-prompt').addEventListener('click', function () {
    prompt.value = defaultPrompt;
    adjustTextareaHeight(prompt);
    checkChat();
}, false);


//--- basic setup for the chat interface ----------------------------------------------//

var chatContainer = document.getElementById('chat');

var chatInterface = new Bubbles(chatContainer, "chatInterface", {
    inputCallbackFn: function (userInput) {
        handleUserInput(userInput);
    }
});

// Set up conversation object that we'll pump things into to go in the chat interface
var conversation = {
    "ice": {
        says: ["Hey there!\n\nWelcome to my AI-driven prototype that simplifies user interview summarization and synthesis. It also lets you (simulate) chatting with the interviewees!\n\nGot your own transcript .txt files? Upload them for the best experience (label interviewees as \"user:\"). Or try using the sample files from a University of Bath study on recovering drug addicts (https://researchdata.bath.ac.uk/1096/).\n\nThis app uses a secure connection, and doesn't keep any data beyond 6 hours. The app uses the OpenAI API, which might hold data up to 30 days for operational purposes (more info: https://openai.com/enterprise-privacy).\n\nDive in and have fun! 😁"],
        // No other predefined replies since they will be dynamically added in
    }
};


//--- start up the chat interface -----------------------------------------------------//

chatInterface.talk(conversation, "ice");

//helper function to have the bot say something
async function say(m) {
    // Update the conversation object based on the response
    var workingStep = await generateChatId();// Using a chatID again here again as a unique identifier
    conversation[workingStep] = {
        says: [m] // Assuming 'message' is part of your dynamic response
    };
    // Continue the conversation
    chatInterface.talk(conversation, workingStep);
    console.log(m);
}


//--- server interop ------------------------------------------------------------------//

const server = "https://chatserver.claytonbford.com";
const SRError = "Error sending and/or recieving a message: ";

// Generate UUID for chat ID
async function generateChatId() {
    return 'chat_' + ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

// Start a chat session
async function startChat(id) {
    try {
        await postRequest('/start-chat', { chatId: id });
        return true;
    } catch (error) {
        return "Error starting a chat session on the server: " + error.message;
    }
}

// Send a chat message
async function sendChat(id, message) {
    message = message.trim();
    try {
        var response = await postRequest('/send-message', { chatId: id, message })
        return response.reply;
    } catch (error) {
        return SRError + error.message;
    }
}

// End a chat session
async function endChat(id) {
    try {
        await postRequest('/clear-chat', { chatId: id })
        return true;
    } catch (error) {
        return "Error ending a chat session on the server: " + error.message;
    }
}

// Helper function for POST requests
async function postRequest(endpoint, data) {
    return fetch(server + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }).then(response => {
        if (!response.ok) throw new Error('Network response was not ok');
        return response.text(); // Use text() instead of json()
    }).then(text => {
        return text ? JSON.parse(text) : {}; // Parse the text only if it's not empty
    });
}

//--- Check and set if we can hit the start chat button or not ------------------------//

var isProcessingFiles = false;

function checkChat() {
    var textarea = document.querySelector('.input-wrap textarea');
    var startChatButton = document.getElementById('startChat')
    if (files.length > 0 && prompt.value != "" && !isProcessingFiles) {
        //set active
        startChatButton.disabled = false;
    }
    else {
        //set inactive
        // Add the CSS class to make it invisible and non-interactable
        textarea.classList.add('invisible-textarea');
        startChatButton.disabled = true;
    }
}


//--- start chat processing -----------------------------------------------------------//

const chatButton = document.getElementById('startChat');

//force checking if the start chat button can be pressed on page load.
//the way things load by default means the answer is no.
window.onload = function () {
    checkChat();
};

var workingID = null;
var chatPrompt = null;

const resetChatButton = document.getElementById('reset-chat')
resetChatButton.disabled = true;

// function to do all the processing to get a meta-summary, and kick off a chat session
chatButton.addEventListener('click', async function () {
    if (!isProcessingFiles) {
        isProcessingFiles = true;
        resetChatButton.disabled = true;

        checkChat();

        try {
            say("Alright, I'm going to go through the selected transcripts and summarize them individually first.");

            let summaries = [];

            for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
                say("Processing file " + (fileIndex + 1).toString() + "/" + files.length.toString() + " (" + files[fileIndex].name + ")...");
                //chatInterface.think();

                workingID = await generateChatId();
                let startSuccess = await startChat(workingID);
                if (startSuccess != true) {
                    throw new Error(startSuccess);
                }

                let fileContents = await readFileContents(files[fileIndex]);
                let response = await sendChat(workingID, prompt.value + fileContents);

                if (!response.startsWith(SRError)) {
                    summaries.push(response);
                    say("Summary " + (fileIndex + 1).toString() + "/" + files.length.toString() + ":\n" + response);
                }
                else {
                    throw new Error(response);
                }

                let endSuccess = await endChat(workingID);
                if (endSuccess != true) {
                    throw new Error(endSuccess);
                }

                //chatInterface.stop();
                say("File " + (fileIndex + 1).toString() + " processed!");
            }
            say("All transcripts summerized! Next, I'm going to merge the summerizations into one meta-summary...")
            //chatInterface.think();

            var buildPrompt = "Combine the following interview transcript-derived summaries into a single meta-summary with the same structure. Your response cannot be in paragraph format. You must equally weight each of the summaries in your response. Your meta-summary will include more points in each section than the individual summaries below to capture as much detail as possible while synthesizing.\n\n\n";
            for (var i = 0; i < summaries.length; i++) {
                buildPrompt += summaries[i];
                buildPrompt += "\n\n\n";
            }
            buildPrompt += "Remember, combine these interview transcript-derived summaries into a single meta-summary with the same structure. Your response cannot be in paragraph format. You must equally weight each of the summaries in your response. Your meta-summary will include more points in each section than the individual summaries below to capture as much detail as possible while synthesizing."

            workingID = await generateChatId();
            var startSuccess = await startChat(workingID);
            if (startSuccess != true) {
                throw new Error(startSuccess);
            }

            var meta = await sendChat(workingID, buildPrompt);
            if (meta.startsWith(SRError)) {
                throw new Error(meta);
            }

            var endSuccess = await endChat(workingID);
            if (endSuccess != true) {
                throw new Error(endSuccess);
            }

            //chatInterface.stop();
            say("Meta summary complete! Here it is:");
            say(meta);

            say("I'll fetch the user now to talk with you 😁")
            //chatInterface.think();

            workingID = await generateChatId();
            var startSuccess = await startChat(workingID);
            if (startSuccess != true) {
                throw new Error(startSuccess);
            }

            var buildPrompt = "I would like to simulate talking to the user described by the following summary. Respond to all further input as this user, as described. Don't ask questions. Avoid contradicting this description. Your response to this prompt should be as this user, starting a conversation with me with a very short greeting.\n\n\n";
            buildPrompt += meta;
            chatPrompt = buildPrompt;

            var response = await sendChat(workingID, buildPrompt);
            if (response.startsWith(SRError)) {
                throw new Error(response);
            }

            //chatInterface.stop();
            say(response);

            var textarea = document.querySelector('.input-wrap textarea');
            textarea.classList.remove('invisible-textarea');

            var startChatButton = document.getElementById('startChat')
            startChatButton.disabled = true;

        } catch (error) {
            say(error.message);
        }

        isProcessingFiles = false;
        checkChat();
        resetChatButton.disabled = false;
    }
}, false);


//--- handle conversation input -------------------------------------------------------//
async function handleUserInput(userInput) {
    //hide text entry box
    var textarea = document.querySelector('.input-wrap textarea');
    textarea.classList.add('invisible-textarea');

    resetChatButton.disabled = true;
    isProcessingFiles = true;
    checkChat();

    var i = userInput.input;

    if (i.length > 0) {
        chatInterface.think();
        try {
            var response = await sendChat(workingID, i);
            if (response.startsWith(SRError)) {
                throw new Error(response);
            }
        } catch (error) {
            say(error.message);
        }

        chatInterface.stop();

        say(response);
    }
    //show text entry box
    textarea.classList.remove('invisible-textarea');

    resetChatButton.disabled = false;
    isProcessingFiles = false;
    checkChat();
}

//when the textarea becomes visible, we want the cursor in it.
var inputtextarea = document.querySelector('.input-wrap textarea');
var observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
        if (mutation.attributeName === 'class') {
            var classList = inputtextarea.classList;
            if (!classList.contains('invisible-textarea')) {
                inputtextarea.focus();
            }
        }
    });
});
observer.observe(inputtextarea, {
    attributes: true
});

//--- reset everything button ---------------------------------------------------------//
const refreshButton = document.getElementById('refresh');

refreshButton.addEventListener('click', function () {
    location.reload();
}, false);

//--- reset chat button ---------------------------------------------------------------//
resetChatButton.addEventListener('click', async function () {
    resetChatButton.disabled = true;
    isProcessingFiles = true;
    checkChat();

    say("Restarting the conversation...")
    //chatInterface.think();
    try {
        workingID = await generateChatId();
        var startSuccess = await startChat(workingID);
        if (startSuccess != true) {
            throw new Error(startSuccess);
        }

        var response = await sendChat(workingID, chatPrompt);
        if (response.startsWith(SRError)) {
            throw new Error(response);
        }
    } catch (error) {
        say(error.message);
    }
    //chatInterface.stop();
    say(response);

    var textarea = document.querySelector('.input-wrap textarea');
    textarea.classList.remove('invisible-textarea');

    resetChatButton.disabled = false;
    isProcessingFiles = false;
    checkChat();
}, false);