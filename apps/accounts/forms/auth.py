from django import forms
from django.contrib.auth import get_user_model
from django.contrib.auth.forms import AuthenticationForm
from django.utils.translation import gettext_lazy as _

UserModel = get_user_model()


class PendingAwareAuthenticationForm(AuthenticationForm):
    error_messages = {
        **AuthenticationForm.error_messages,
        "inactive_pending": _(
            "Sua conta ainda está aguardando liberação pela editora. Assim que for aprovada você será avisado."
        ),
    }

    def clean(self):
        username = self.cleaned_data.get("username")
        password = self.cleaned_data.get("password")

        if username and password:
            try:
                user = UserModel.objects.get(email__iexact=username)
            except UserModel.DoesNotExist:
                pass
            else:
                if not user.is_active and user.check_password(password):
                    raise forms.ValidationError(
                        self.error_messages["inactive_pending"],
                        code="inactive_pending",
                    )

        return super().clean()
