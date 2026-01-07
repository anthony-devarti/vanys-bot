const path = require('path');
const handleSmallTalk = require(path.join(__dirname, '..', 'src', 'handlers', 'smallTalk'));

async function runTest() {
  const message = {
    author: { id: 'tester-1' },
    reply: async (text) => {
      console.log('REPLY:', text);
    }
  };

  const context = {
    playerName: 'Tester',
    content: 'What do you know about the Tidebound?',
    getSmallTalkTopicsFromKB: () => []
  };

  try {
    const handled = await handleSmallTalk(message, context);
    console.log('HANDLED:', handled ? 'yes' : 'no');
  } catch (err) {
    console.error('ERROR:', err);
  }
}

runTest();
