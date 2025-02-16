
from ..groc_default.groc_base import Groc


class GrocData(Groc):

    def __init__(self, datalake_id=''):
        super().__init__()
        self.datalake_id = datalake_id

    def get_payload_from_product_object(self, payload):
        if type(self) is not DataLakeCreate and self.datalake_id:
            payload.update({'datalake_id': self.datalake_id})
        return payload


class DataLakeFetch(GrocData):
    api_endpoint = '/datalake/document/fetch'

    def fetch(self, payload):
        return self.call_api(payload)


class DataLakePush(GrocData):
    api_endpoint = '/datalake/document/push'

    def push(self, payload):
        return self.call_api(payload)


class DataLakeCreate(GrocData):
    api_endpoint = '/datalake/create'

    def create(self, payload=None):
        if payload is None:
            payload = {}
        return self.call_api(payload)


class DataLake:
    def __init__(self, datalake_id=''):
        self.datalake_id = datalake_id
        self._creator = None
        self._fetcher = None
        self._pusher = None

    def _get_creator(self):
        if self._creator is None:
            self._creator = DataLakeCreate()
        return self._creator

    def _get_fetcher(self):
        if self._fetcher is None:
            self._fetcher = DataLakeFetch(self.datalake_id)
        return self._fetcher

    def _get_pusher(self):
        if self._pusher is None:
            self._pusher = DataLakePush(self.datalake_id)
        return self._pusher

    def fetch(self, payload):
        return self._get_fetcher().fetch(payload)

    def push(self, payload):
        return self._get_pusher().push(payload)

    def create(self, payload=None):
        if payload is None:
            payload = {}
        create_response = self._get_creator().create(payload)
        if create_response.get('datalake_id'):
            self.datalake_id = create_response.get('datalake_id')
        return create_response
