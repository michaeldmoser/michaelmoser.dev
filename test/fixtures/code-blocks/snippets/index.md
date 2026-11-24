---
title: Snippets in Many Languages
date: 2026-06-01T00:00:00Z
description: A post with a fenced block in every supported language.
---

Ruby:

```ruby
class Greeter
  def hello(name)
    puts "Hello, #{name}"
  end
end
```

ERB:

```erb
<% items.each do |item| %>
  <li><%= item.name %></li>
<% end %>
```

JavaScript:

```javascript
const total = items.reduce((sum, item) => sum + item.price, 0)
```

TypeScript:

```typescript
interface User {
  id: number
  name: string
}
export function load(id: number): User | undefined {
  return undefined
}
```

JSX:

```jsx
const Button = () => <button className="primary">Save</button>
```

TSX:

```tsx
const Label = ({ text }: { text: string }) => <span className="label">{text}</span>
```

Handlebars:

```handlebars
{{#if author}}
  <h1>{{author.firstName}}</h1>
{{/if}}
```

HCL:

```hcl
resource "aws_s3_bucket" "site" {
  bucket = "example-bucket"
}
```

YAML:

```yaml
services:
  web:
    image: nginx
    ports:
      - "80:80"
```

SQL:

```sql
SELECT id, name FROM users WHERE active = 1 ORDER BY name;
```

Bash:

```bash
for file in *.md; do
  echo "$file"
done
```

Dockerfile:

```dockerfile
FROM node:22
WORKDIR /app
COPY . .
RUN npm ci
```

JSON:

```json
{
  "name": "example",
  "count": 3,
  "enabled": true
}
```

Python:

```python
def add(a, b):
    return a + b
```

No language:

```
unlabeled fence content
```

Unlisted language:

```zzzlang
mystery fence content
```
