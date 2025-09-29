from django.urls import path

from .views import course_data, index

app_name = 'conteudo'

urlpatterns = [
    path('data.json', course_data, name='course-data'),
    path('', index, name='home'),
]