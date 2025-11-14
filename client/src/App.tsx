import { useEffect, useState } from 'react';
import './App.css';
import { logger } from './logger';

function App() {
  const [logMessage, setLogMessage] = useState('');
  useEffect(() => {
    logger.addContext({ UserName: 'johndoe@gmail.com' });
    logger.information('Application started');
  }, []);
  const handleSendLog = () => {
    if (logMessage.trim()) {
      logger.information('User message: {Message}', {
        Message: logMessage,
        Timestamp: new Date().toISOString(),
        MessageLength: logMessage.length,
      });
      setLogMessage('');
    }
  };

  const handleSendError = () => {
    logger.error(new Error('Intentional error'), 'Error occured');
  };

  return (
    <>
      <div
        className="card"
        style={{
          maxWidth: '600px',
          margin: '0 auto',
          padding: '2em',
          border: '1px solid #ccc',
          borderRadius: '8px',
        }}
      >
        <h3>Send Custom Log Message</h3>
        <textarea
          value={logMessage}
          onChange={e => setLogMessage(e.target.value)}
          placeholder="Enter your log message here..."
          style={{
            width: '100%',
            minHeight: '80px',
            padding: '10px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '14px',
            resize: 'vertical',
            boxSizing: 'border-box',
            marginBottom: '15px',
          }}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '15px',
          }}
        >
          <button
            onClick={handleSendLog}
            disabled={!logMessage.trim()}
            style={{
              padding: '10px 20px',
              backgroundColor: logMessage.trim() ? '#646cff' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: logMessage.trim() ? 'pointer' : 'not-allowed',
              fontSize: '16px',
            }}
          >
            Send Log Message
          </button>
          <button
            onClick={handleSendError}
            style={{
              padding: '10px 20px',
              backgroundColor: '#ff4757',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            Send Error Log
          </button>
        </div>
      </div>
    </>
  );
}

export default App;
