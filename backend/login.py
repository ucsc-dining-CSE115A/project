from supabase import create_client, Client
import getpass

## Supabase configuration ##
SUPABASE_URL = "https://gwgcyxzuxzecqqutaevr.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3Z2N5eHp1eHplY3FxdXRhZXZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NTc5OTIsImV4cCI6MjA3ODUzMzk5Mn0.dt8q2eLImQlEQ1uzZTx-CqG42J-CRGErKbUaxgGbTmA"
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
# Table has columns: id, username, and password

def sign_up():

    username = input("Enter username: ").strip()
    password = getpass.getpass("Get password: ").strip()

    ## checking to see if username is unique
    exist = supabase.table("login").select("username").eq("username", username).execute()

    if exist.data:
        print("Username already taken, please choose a different one.")
        return
    
    ## insert unique username and passowrd into supabase datatable
    result = supabase.table("login").insert({
        "username": username,
        "password": password 
    }).execute()
