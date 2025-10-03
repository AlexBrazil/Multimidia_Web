import re
from typing import Optional

from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _


CPF_BLACKLIST = {str(i) * 11 for i in range(10)}
CNPJ_BLACKLIST = {str(i) * 14 for i in range(10)}


def only_digits(value: str) -> str:
    if value is None:
        return ""
    return re.sub(r"\D", "", value)


def normalize_cpf(value: str) -> str:
    digits = only_digits(value)
    if len(digits) != 11 or digits in CPF_BLACKLIST:
        raise ValidationError(_("CPF invalido."))

    for i in range(9, 11):
        sum_ = sum(int(digits[num]) * ((i + 1) - num) for num in range(0, i))
        check = ((sum_ * 10) % 11) % 10
        if check != int(digits[i]):
            raise ValidationError(_("CPF invalido."))
    return digits


def normalize_cnpj(value: str) -> str:
    digits = only_digits(value)
    if len(digits) != 14 or digits in CNPJ_BLACKLIST:
        raise ValidationError(_("CNPJ invalido."))

    weights_1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    weights_2 = [6] + weights_1

    def calc(weights):
        total = sum(int(num) * weight for num, weight in zip(digits, weights))
        remainder = total % 11
        return "0" if remainder < 2 else str(11 - remainder)

    if calc(weights_1) != digits[12] or calc(weights_2) != digits[13]:
        raise ValidationError(_("CNPJ invalido."))
    return digits


def normalize_cep(value: str) -> str:
    digits = only_digits(value)
    if len(digits) != 8:
        raise ValidationError(_("CEP deve ter 8 digitos."))
    return digits


def normalize_phone(value: str, *, field_label: Optional[str] = None) -> str:
    digits = only_digits(value)
    if len(digits) < 10 or len(digits) > 13:
        label = field_label or _("Telefone")
        raise ValidationError(_("%(label)s invalido."), params={"label": label})
    return digits


__all__ = [
    "normalize_cpf",
    "normalize_cnpj",
    "normalize_cep",
    "normalize_phone",
    "only_digits",
]
