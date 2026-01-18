from django.urls import path

from .views import course_data, course_select, index, progress_overview, progress_interaction

app_name = 'conteudo'

urlpatterns = [
    path('courses/<str:product_id>/data.json', course_data, name='course-data'),
    path('courses/<str:product_id>/progress/', progress_overview, name='progress-overview'),
    path('courses/<str:product_id>/progress/interaction/', progress_interaction, name='progress-interaction'),
    path('courses/<str:product_id>/', index, name='course-home'),
    path('data.json', course_data, name='course-data-default'),
    path('progress/', progress_overview, name='progress-overview-default'),
    path('progress/interaction/', progress_interaction, name='progress-interaction-default'),
    path('', course_select, name='home'),
]
