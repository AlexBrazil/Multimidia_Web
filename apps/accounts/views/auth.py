from django.contrib.auth.views import LoginView, LogoutView
from django.urls import reverse_lazy

from ..forms import PendingAwareAuthenticationForm


class UserLoginView(LoginView):
    template_name = "accounts/login.html"
    redirect_authenticated_user = True
    form_class = PendingAwareAuthenticationForm


class UserLogoutView(LogoutView):
    next_page = reverse_lazy("accounts:login")
    http_method_names = ["get", "post", "options"]

    def get(self, request, *args, **kwargs):
        return self.post(request, *args, **kwargs)
