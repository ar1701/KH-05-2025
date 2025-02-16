from flask import Flask, request, jsonify
import os
from groclake.modellake import ModelLake

# Initialize Flask app
app = Flask(__name__)

# Environment variable setup
os.environ['GROCLAKE_API_KEY'] = '43ec517d68b6edd3015b3edc9a11367b'
os.environ['GROCLAKE_ACCOUNT_ID'] = '7376846f01e0b6e5f1568fef7b48a148'

# Initialize Groclake model instance
model_lake = ModelLake()

# Conversation history (per session)
conversation_history = []

# API route for chatbot interaction
@app.route('/chat', methods=['POST'])
def chat():
    try:
        global conversation_history
        data = request.json  # Get JSON payload from the client

        user_input = data.get('user_input')
        if not user_input:
            return jsonify({'error': 'user_input is required'}), 400

        # Append user's input to conversation history
        conversation_history.append({"role": "user", "content": user_input})

        # Create the payload
        payload = {
            "messages": conversation_history,
            "token_size": 300  # Max tokens for response
        }

        # Pass the payload to chat_complete
        response = model_lake.chat_complete(payload=payload)

        # Extract the assistant's reply
        bot_reply = response.get('answer', 'Sorry, I couldn\'t process that.')

        # Append the bot's reply to conversation history
        conversation_history.append({"role": "assistant", "content": bot_reply})

        # Return the bot's reply
        return jsonify({'bot_reply': bot_reply})

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# API route for additional chatbot interaction
@app.route('/ask', methods=['POST'])
def ask():
    try:
        global conversation_history
        data = request.json  # Get JSON payload from the client

        user_input = data.get('user_input')
        if not user_input:
            return jsonify({'error': 'user_input is required'}), 400

        # Append user's input to conversation history
        conversation_history.append({"role": "user", "content": user_input})

        # Create the payload
        payload = {
            "messages": conversation_history,
            "token_size": 300  # Max tokens for response
        }

        # Pass the payload to chat_complete
        response = model_lake.chat_complete(payload=payload)

        # Extract the assistant's reply
        bot_reply = response.get('answer', 'Sorry, I couldn\'t process that.')

        # Append the bot's reply to conversation history
        conversation_history.append({"role": "assistant", "content": bot_reply})

        # Return the bot's reply
        return jsonify({'bot_reply': bot_reply})

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# API route to reset the conversation
@app.route('/reset', methods=['POST'])
def reset_conversation():
    global conversation_history
    conversation_history = []
    return jsonify({'message': 'Conversation reset successfully'})

# Run the Flask server
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8000)
