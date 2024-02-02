I've been curious for a while how AI can help with synthesizing user research and help design teams interact with the knowledge they've already gained from customer touchpoints. To that end, I've developed this web application for synthesizing research transcripts into summaries and using those summaries to launch a "conversation" with the "user".

The application uses the following prompting strategy to to effectively focus the information from transcripts:
1. Takes in transcript files and summarizes each using a given summarization prompt.
2. Merges the summaries into a meta-summary with the same structure.
3. Begins a conversation with the application user, using the meta-summary as the basis for its character.

The idea behind this strategy is that by focusing the AI model on known important attributes:
1. The researcher will get more key information from targeted summarization.
2. The AI model will not get "lost in the sauce" from the huge context window that would be nesessary for processing all transcripts at once.
3. Processing time for a conversational interface will be reduced from one attempting to use all transcript data simultaneously.

The client-side manages the pertinents of synthsizing and chatting, the Node.js/Express server application (server.js) merely handles interop with the OpenAI API as to not expose or require an API key.

Developed by Clayton Ford

Additional credits:
<a href="https://github.com/dmitrizzle/chat-bubble/tree/master">dmitrizzle/chat-bubble</a> for the chat bubble interface that I modified for use in this app,
<a href="https://researchdata.bath.ac.uk/1096/">"Interview transcripts of addiction therapists and recovering drug service users"</a> from the University of Bath, which was a great data set for development and is included in the app as sample data to users to try,
and ChatGPT for lightening the development load.
