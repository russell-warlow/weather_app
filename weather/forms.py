from django import forms
from django.contrib.auth.models import User


# from Django 4 By Example by Antonio Mele
class UserRegistrationForm(forms.ModelForm):
    password = forms.CharField(label="Password", widget=forms.PasswordInput)
    password2 = forms.CharField(label="Repeat password", widget=forms.PasswordInput)

    class Meta:
        model = User
        fields = ["username", "first_name", "email"]

    def clean_password2(self):
        cd = self.cleaned_data
        if cd["password"] != cd["password2"]:
            raise forms.ValidationError("Passwords don't match.")
        return cd["password2"]


# from Django 4 By Example by Antonio Mele
class UserEditForm(forms.ModelForm):
    class Meta:
        model = User
        fields = ["username", "first_name", "email"]


class LoginForm(forms.Form):
    username = forms.CharField()
    password = forms.CharField(widget=forms.PasswordInput)
