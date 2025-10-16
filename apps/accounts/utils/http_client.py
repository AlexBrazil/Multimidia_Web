# apps/accounts/utils/http_client.py
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

def build_session(
    total_retries: int = 3,
    backoff_factor: float = 0.5,
    status_forcelist: tuple[int, ...] = (429, 500, 502, 503, 504),
) -> requests.Session:
    """
    Session com retry exponencial:
      0.5s, 1.0s, 2.0s ... (backoff_factor * (2 ** (n-1)))
    """
    retry = Retry(
        total=total_retries,
        read=total_retries,
        connect=total_retries,
        status=total_retries,
        backoff_factor=backoff_factor,
        status_forcelist=status_forcelist,
        allowed_methods={"GET", "POST", "PUT", "DELETE", "PATCH"},
        raise_on_status=False,
        raise_on_redirect=False,
    )
    adapter = HTTPAdapter(max_retries=retry, pool_connections=10, pool_maxsize=10)
    s = requests.Session()
    s.mount("http://", adapter)
    s.mount("https://", adapter)
    return s
