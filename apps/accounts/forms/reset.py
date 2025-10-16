# apps/accounts/forms/reset.py
from django import forms
from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _
from ..validators import normalize_phone
from ..models import UserProfile

User = get_user_model()

class PasswordResetRequestForm(forms.Form):
    email = forms.EmailField(label=_("E-mail"))

    def clean_email(self):
        email = self.cleaned_data["email"].lower().strip()
        try:
            self.user = User.objects.get(email__iexact=email, is_active=True)
        except User.DoesNotExist:
            # Segurança: não revelar se existe ou não
            raise forms.ValidationError(_("Se o e-mail existir, enviaremos as instruções."))
        # Confirma que há perfil + whatsapp
        if not hasattr(self.user, "profile") or not self.user.profile.whatsapp:
            raise forms.ValidationError(_("Esta conta não tem WhatsApp cadastrado."))
        return email

    def get_user(self):
        return getattr(self, "user", None)
