
from ..groc_default.groc_base import Groc


class GrocVector(Groc):

    def __init__(self, vectorlake_id=''):
        super().__init__()
        self.vectorlake_id = vectorlake_id

    def get_payload_from_product_object(self, payload):
        if type(self) is not VectorLakeCreate and self.vectorlake_id:
            payload.update({'vectorlake_id': self.vectorlake_id})
        return payload


class VectorLakeGenerate(GrocVector):
    api_endpoint = '/vector/generate'

    def generate(self, query):
        return self.call_api({'query': query})


class VectorLakePush(GrocVector):
    api_endpoint = '/vector/push'

    def push(self, payload):
        return self.call_api(payload)


class VectorLakeSearch(GrocVector):
    api_endpoint = '/vector/search'

    def search(self, payload):
        return self.call_api(payload)


class VectorLakeCreate(GrocVector):
    api_endpoint = '/vector/create'

    def create(self, payload=None):
        if payload is None:
            payload = {}
        return self.call_api(payload)


class VectorLake:
    def __init__(self, vectorlake_id=''):
        self.vectorlake_id = vectorlake_id
        self._generator = None
        self._pusher = None
        self._searcher = None
        self._creator = None

    def _get_generator(self):
        if self._generator is None:
            self._generator = VectorLakeGenerate(self.vectorlake_id)
        return self._generator

    def _get_pusher(self):
        if self._pusher is None:
            self._pusher = VectorLakePush(self.vectorlake_id)
        return self._pusher

    def _get_searcher(self):
        if self._searcher is None:
            self._searcher = VectorLakeSearch(self.vectorlake_id)
        return self._searcher

    def _get_creator(self):
        if self._creator is None:
            self._creator = VectorLakeCreate(self.vectorlake_id)
        return self._creator

    def generate(self, query):
        return self._get_generator().generate(query)

    def push(self, payload):
        return self._get_pusher().push(payload)

    def search(self, payload):
        return self._get_searcher().search(payload)

    def create(self, payload=None):
        if payload is None:
            payload = {}
        create_response = self._get_creator().create(payload)
        if create_response.get('vectorlake_id'):
            self.vectorlake_id = create_response.get('vectorlake_id')
        return create_response
