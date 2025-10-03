from django import forms
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from ..models import CustomUser, PersonType, UserProfile, UserRoles
from ..validators import normalize_cep, normalize_cnpj, normalize_cpf, normalize_phone


class BaseRegistrationForm(forms.Form):
    role = None
    person_type = None

    email = forms.EmailField(label="E-mail")
    username = forms.CharField(label="Nome de usuario", max_length=150)
    password1 = forms.CharField(label="Senha", widget=forms.PasswordInput)
    password2 = forms.CharField(label="Confirme a senha", widget=forms.PasswordInput)

    whatsapp = forms.CharField(label="WhatsApp", max_length=20)
    fone = forms.CharField(label="Telefone", max_length=20, required=False)

    cep = forms.CharField(label="CEP", max_length=9)
    estado = forms.CharField(label="Estado (UF)", max_length=2)
    municipio = forms.CharField(label="Municipio", max_length=255)
    bairro = forms.CharField(label="Bairro", max_length=255)
    endereco = forms.CharField(label="Endereco", max_length=255)

    obs = forms.CharField(label="Observacoes", widget=forms.Textarea, required=False)

    accept_terms = forms.BooleanField(
        label=_("Li e aceito os termos de uso"),
        error_messages={"required": _("Voce precisa aceitar os termos de uso.")},
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.role is None or self.person_type is None:
            raise ValueError("role e person_type precisam ser definidos nas subclasses")

    # --- Cleaners ---------------------------------------------------------
    def clean_email(self):
        email = self.cleaned_data["email"].lower()
        if CustomUser.objects.filter(email__iexact=email).exists():
            raise forms.ValidationError("Ja existe um usuario com esse e-mail.")
        return email

    def clean_username(self):
        username = self.cleaned_data["username"].strip()
        if CustomUser.objects.filter(username__iexact=username).exists():
            raise forms.ValidationError("Esse nome de usuario ja esta em uso.")
        return username

    def clean_password2(self):
        pwd1 = self.cleaned_data.get("password1")
        pwd2 = self.cleaned_data.get("password2")
        if pwd1 and pwd2 and pwd1 != pwd2:
            raise forms.ValidationError("As senhas informadas sao diferentes.")
        return pwd2

    def clean_estado(self):
        estado = self.cleaned_data["estado"].strip().upper()
        if len(estado) != 2:
            raise forms.ValidationError("Informe a sigla do estado (ex.: SP).")
        return estado

    def clean_whatsapp(self):
        return normalize_phone(self.cleaned_data["whatsapp"], field_label="WhatsApp")

    def clean_fone(self):
        value = self.cleaned_data.get("fone")
        if not value:
            return ""
        return normalize_phone(value, field_label="Telefone")

    def clean_cep(self):
        return normalize_cep(self.cleaned_data["cep"])

    def clean_obs(self):
        return (self.cleaned_data.get("obs") or "").strip()

    # --- Helpers ----------------------------------------------------------
    def get_role(self):
        return self.role

    def get_person_type(self):
        return self.person_type

    def get_user_data(self):
        return {
            "email": self.cleaned_data["email"],
            "username": self.cleaned_data["username"],
            "password": self.cleaned_data["password1"],
            "role": self.get_role(),
            "is_active": False,
        }

    def get_profile_common(self):
        return {
            "person_type": self.get_person_type(),
            "estado": self.cleaned_data["estado"],
            "municipio": self.cleaned_data["municipio"],
            "bairro": self.cleaned_data["bairro"],
            "endereco": self.cleaned_data["endereco"],
            "cep": self.cleaned_data["cep"],
            "whatsapp": self.cleaned_data["whatsapp"],
            "fone": self.cleaned_data["fone"],
            "obs": self.cleaned_data.get("obs", ""),
            "terms_accepted": True,
            "terms_accepted_at": timezone.now(),
            "cpf": "",
            "cnpj": "",
            "nome_legal": "",
            "nome_fantasia": "",
        }

    def get_profile_data(self):
        raise NotImplementedError


class PessoaFisicaForm(BaseRegistrationForm):
    person_type = PersonType.PF

    nome_completo = forms.CharField(label="Nome completo", max_length=255)
    cpf = forms.CharField(label="CPF", max_length=14)

    def clean_cpf(self):
        cpf = normalize_cpf(self.cleaned_data["cpf"])
        if UserProfile.objects.filter(cpf=cpf).exists():
            raise forms.ValidationError("Este CPF ja esta cadastrado.")
        return cpf

    def get_profile_data(self):
        data = self.get_profile_common()
        data.update(
            {
                "cpf": self.cleaned_data["cpf"],
                "nome_legal": self.cleaned_data["nome_completo"],
            }
        )
        return data


class PessoaJuridicaForm(BaseRegistrationForm):
    person_type = PersonType.PJ

    razao_social = forms.CharField(label="Razao Social", max_length=255)
    nome_fantasia = forms.CharField(label="Nome Fantasia", max_length=255, required=False)
    cnpj = forms.CharField(label="CNPJ", max_length=18)
    responsavel = forms.CharField(label="Nome do responsavel", max_length=255)

    def clean_cnpj(self):
        cnpj = normalize_cnpj(self.cleaned_data["cnpj"])
        if UserProfile.objects.filter(cnpj=cnpj).exists():
            raise forms.ValidationError("Este CNPJ ja esta cadastrado.")
        return cnpj

    def _assemble_obs(self):
        base = (self.cleaned_data.get("obs") or "").strip()
        responsavel = (self.cleaned_data.get("responsavel") or "").strip()
        if responsavel:
            extra = f"Responsavel: {responsavel}"
            base = f"{base}\n{extra}".strip() if base else extra
        return base

    def get_profile_data(self):
        data = self.get_profile_common()
        data.update(
            {
                "cnpj": self.cleaned_data["cnpj"],
                "nome_legal": self.cleaned_data["razao_social"],
                "nome_fantasia": self.cleaned_data.get("nome_fantasia", ""),
                "obs": self._assemble_obs(),
            }
        )
        return data


class AlunoPFRegisterForm(PessoaFisicaForm):
    role = UserRoles.ALUNO


class AlunoPJRegisterForm(PessoaJuridicaForm):
    role = UserRoles.ALUNO


class GestorPFRegisterForm(PessoaFisicaForm):
    role = UserRoles.GESTOR


class GestorPJRegisterForm(PessoaJuridicaForm):
    role = UserRoles.GESTOR
