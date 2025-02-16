
from ..groc_default.groc_base import Groc


class ModelLakeTranslate(Groc):
    api_endpoint = '/modellake/translate'

    def translate(self, payload):
        return self.call_api(payload)


class ModelLakeChatComplete(Groc):
    api_endpoint = '/modellake/chat/completion'

    def chat_complete(self, payload):
        return self.call_api(payload)


class ModelLakeTextToSpeech(Groc):
    api_endpoint = '/modellake/textToSpeech'

    def text_to_speech(self, payload):
        return self.call_api(payload)


class ModelLake:
    def __init__(self):
        self._translator = None
        self._chat_completer = None
        self._text_to_speech = None

    def _get_translator(self):
        if self._translator is None:
            self._translator = ModelLakeTranslate()
        return self._translator

    def _get_chat_completer(self):
        if self._chat_completer is None:
            self._chat_completer = ModelLakeChatComplete()
        return self._chat_completer

    def _get_text_to_speech(self):
        if self._text_to_speech is None:
            self._text_to_speech = ModelLakeTextToSpeech()
        return self._text_to_speech

    def translate(self, payload):
        return self._get_translator().translate(payload)

    def chat_complete(self, payload):
        return self._get_chat_completer().chat_complete(payload)

    def text_to_speech(self, payload):
        return self._get_text_to_speech().text_to_speech(payload)
