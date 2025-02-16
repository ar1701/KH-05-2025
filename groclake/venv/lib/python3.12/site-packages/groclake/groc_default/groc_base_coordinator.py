
import requests


class GrocBaseCoordinator:

    def __init__(self, base_url=''):
        self.base_url = base_url.rstrip('/')

    @staticmethod
    def format_path(path: str) -> str:
        return '/' + path.lstrip('/')

    def action(self, path: str) -> str:
        return self.base_url + self.format_path(path)

    def post(self, path, payload=None, headers=None, params=None, data=None, timeout=20):
        response = requests.post(self.action(path), params=params, json=payload, headers=headers, data=data, timeout=timeout)
        return response

    def get(self, path, payload=None, headers=None, timeout=90):
        response = requests.get(self.action(path), params=payload, headers=headers, timeout=timeout)
        return response
