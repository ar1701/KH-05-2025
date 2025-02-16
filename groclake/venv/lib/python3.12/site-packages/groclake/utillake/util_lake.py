from flask import Flask, request, jsonify


class AttpAdaptor:
    def __init__(self, app, callback):
        self.app = app
        self.callback = callback
        self.app.add_url_rule('/query', 'query_endpoint', self.query_endpoint, methods=['POST'])

    def query_endpoint(self):
        try:
            request_data = request.get_json()
            if not request_data:
                return jsonify({"error": "Invalid or missing JSON payload"}), 400

            header = request_data.get('header', {})
            body = request_data.get('body', {})

            agent_uuid = header.get('client_agent_uuid')
            if not agent_uuid:
                return jsonify({"error": "Missing agent_uuid in request payload"}), 400

            auth_token = header.get('auth_token')
            apc_id = header.get('apc_id')

            query_text = body.get('query_text')
            intents = body.get('intents')
            entities = body.get('entities')
            metadata = body.get('metadata')

            if not query_text:
                return jsonify({"error": "Missing 'query_text' in request payload"}), 400

            if entities and (not isinstance(entities, list) or not all(isinstance(entity, dict) for entity in entities)):
                return jsonify({"error": "Invalid 'entities'. If present, it must be an array of dictionaries."}), 400

            callback_payload = {
                "query_text": query_text,
                "intents": intents,
                "entities": entities,
                "metadata": metadata
            }
            response = self.callback(callback_payload)
            response_payload = {
                "header": {
                    "version": header.get("version", "1.0"),
                    "message": "response",
                    "Content-Type": header.get("Content-Type", "application/json"),
                    "auth_token": header.get("auth_token", "default-auth-token"),
                    "apc_id": header.get("apc_id", "default-apc-id"),
                    "server_agent_uuid": header.get("server_agent_uuid", "default-server-uuid"),
                    "client_agent_uuid": header.get("client_agent_uuid", "default-client-uuid")
                },
                "body": {
                    "query_text": response.get("query_text", ""),
                    "response_text": response.get("response_text", "Search completed successfully."),
                    "intent": response.get("intent", None),
                    "entities": response.get("entities", []),
                    "metadata": response.get("metadata", {})
                }
            }
            return jsonify(response_payload), 200

        except Exception as e:
            return jsonify({"error": "Internal Server Error"}), 500