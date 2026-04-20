# sofin-backend

Backend API cho SOFIN Group. Cào dữ liệu tin tức từ VnExpress để phục vụ tab "Tin tức" phía frontend.

## Cài đặt

```bash
cd c:/Users/dev/Desktop/sofin_backend
cp .env.example .env
npm install
```

## Chạy

```bash
# dev (auto reload)
npm run dev

# production
npm start
```

Server mặc định chạy tại `http://localhost:3001`.

## API

| Method | Endpoint              | Mô tả                                         |
| ------ | --------------------- | --------------------------------------------- |
| GET    | `/health`             | Health check                                  |
| GET    | `/api/news`           | Lấy danh sách tin tức. Query: `?limit=20`     |
| GET    | `/api/news/:id`       | Chi tiết 1 tin theo id                        |
| GET    | `/api/news/refresh`   | Xoá cache và cào lại                          |

### Response shape

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "a1b2c3d4e5f6",
      "image": "https://...jpg",
      "category": "Công nghệ",
      "date": "20 Tháng 4, 2026",
      "title": "Tiêu đề tin",
      "detail": "Mô tả ngắn...",
      "url": "https://vnexpress.net/..."
    }
  ]
}
```

## Kết nối từ frontend (sofin_group)

Trong file `.env` của frontend:

```
VITE_API_BASE_URL=http://localhost:3001/api
```

Rồi gọi `axiosInstance.get('/news')` từ service tương ứng.

## Cấu hình

`.env`:

- `PORT` — cổng server (default 3001)
- `CORS_ORIGIN` — origin cho phép CORS (default `http://localhost:5173`). Có thể truyền nhiều origin, cách nhau bởi dấu phẩy.
- `SCRAPE_SOURCE` — URL nguồn cào (default `https://vnexpress.net/cong-nghe`)
- `CACHE_TTL_MS` — thời gian cache kết quả cào (default 5 phút)
