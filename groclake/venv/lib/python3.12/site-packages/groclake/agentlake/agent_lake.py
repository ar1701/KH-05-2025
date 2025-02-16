from ..groc_default.groc_base import Groc


class AgentRegister(Groc):
    api_endpoint = '/agentlake/agent/register'

    def agent_register(self, payload):
        return self.call_api(payload)


class AgentFetch(Groc):
    api_endpoint = '/agentlake/agent/fetch'

    def agent_data_fetch(self, payload):
        return self.call_api(payload)


class AgentCategoryList(Groc):
    api_endpoint = '/agentlake/categorylist/fetch'

    def category_list_fetch(self):
        return self.get_api_response()


class AgentApcCreate(Groc):
    api_endpoint = '/agentlake/apc/create'

    def agentlake_apc_create(self, payload):
        return self.call_api(payload)


class AgentApcAssign(Groc):
    api_endpoint = '/agentlake/apc/agent/assign'

    def agentlake_apc_assign(self, payload):
        return self.call_api(payload)


class AgentLake:
    def __init__(self):
        self._register = None
        self._fetcher = None
        self._categories = None
        self._apc_creator = None
        self._apc_assign = None

    def _get_register(self):
        if self._register is None:
            self._register = AgentRegister()
        return self._register

    def _get_fetcher(self):
        if self._fetcher is None:
            self._fetcher = AgentFetch()
        return self._fetcher

    def _get_categories(self):
        if self._categories is None:
            self._categories = AgentCategoryList()
        return self._categories

    def _get_apc_creator(self):
        if self._apc_creator is None:
            self._apc_creator = AgentApcCreate()
        return self._apc_creator

    def _get_apc_assign(self):
        if self._apc_assign is None:
            self._apc_assign = AgentApcAssign()
        return self._apc_assign

    def agent_register(self, payload):
        return self._get_register().agent_register(payload)

    def agent_fetch(self, payload):
        return self._get_fetcher().agent_data_fetch(payload)

    def category_list_fetch(self):
        return self._get_categories().category_list_fetch()

    def apc_create(self, payload):
        return self._get_apc_creator().agentlake_apc_create(payload)

    def apc_agent_assign(self, payload):
        return self._get_apc_assign().agentlake_apc_assign(payload)
