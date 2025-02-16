
import os
import requests
from .groc_base_coordinator import GrocBaseCoordinator
from .groc_config import GrocConfig


class Groc:

    api_endpoint = ''

    def __init__(self):
        self.groc_api_key = self.get_groc_api_key()
        self.coordinator = GrocBaseCoordinator(GrocConfig.BASE_URL)

    @staticmethod
    def get_groc_api_key():
        groc_api_key = os.getenv('GROCLAKE_API_KEY')
        if not groc_api_key:
            raise ValueError("GROCLAKE_API_KEY is not set in the environment variables.")
        groc_account_id = os.getenv('GROCLAKE_ACCOUNT_ID')
        if not groc_account_id:
            raise ValueError("GROCLAKE_ACCOUNT_ID is not set in the environment variables.")
        return groc_api_key

    @staticmethod
    def _get_groc_api_headers():
        return {'GROCLAKE-API-KEY': os.getenv('GROCLAKE_API_KEY')}

    @staticmethod
    def _add_groc_account_id(payload):
        payload.update({'groc_account_id': os.getenv('GROCLAKE_ACCOUNT_ID')})

    @staticmethod
    def get_payload_from_product_object(product_object):
        return product_object

    def post_groc_api_response(self, payload, headers):
        self._add_groc_account_id(payload)
        if not self.api_endpoint:
            raise ValueError("Invalid API call.")
        try:
            response = self.coordinator.post(path=self.api_endpoint, payload=payload, headers=headers, timeout=90)
            return response.json(), response.status_code
        except requests.RequestException as e:
            return {"error": str(e)}, 500

    def call_api(self, product_object):
        payload = self.get_payload_from_product_object(product_object)
        headers = self._get_groc_api_headers()
        response, status_code = self.post_groc_api_response(payload=payload, headers=headers)
        if status_code == 200 and 'api_action_status' in response:
            response.pop('api_action_status')
        return response if status_code == 200 else {}

    def get_api_response(self):
        headers = self._get_groc_api_headers()
        response, status_code = self.get_groc_api_response(headers=headers)
        if status_code == 200 and 'api_action_status' in response:
            response.pop('api_action_status')
        return response if status_code == 200 else {}

    def get_groc_api_response(self, headers):
        if not self.api_endpoint:
            raise ValueError("Invalid API call.")
        try:
            response = self.coordinator.get(path=self.api_endpoint, payload=None, headers=headers, timeout=90)
            return response.json(), response.status_code
        except requests.RequestException as e:
            return {"error": str(e)}, 500