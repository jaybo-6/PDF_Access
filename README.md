```
git clone https://github.com/jaybo-6/PDF_Access
cd PDF_Access
```

Create ```.env``` file
```
New-Item -Path . -Name ".env" -ItemType "File"
```
```
DB_HOST=your_database_host
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_DATABASE=your_database_name
SECRET_KEY=your_long_random_secret_key
```
```
npm install
```
```
npx nodemon server.js
```
```
cd client
npm install
npm start
```
