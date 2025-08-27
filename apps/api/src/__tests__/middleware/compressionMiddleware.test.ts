import request from "supertest";
import express from "express";
import { compressionMiddleware } from "../../middleware/compressionMiddleware";

describe("Compression Middleware", () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(compressionMiddleware);
  });

  describe("JSON response compression", () => {
    it("should compress large JSON responses", async () => {
      // Create a large JSON response > 1KB
      const largeData = {
        items: Array.from({ length: 100 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          description:
            "This is a test item with a long description that helps make the response larger",
          metadata: {
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
            tags: ["tag1", "tag2", "tag3", "tag4", "tag5"],
          },
        })),
      };

      app.get("/large-json", (req, res) => {
        res.json(largeData);
      });

      const response = await request(app).get("/large-json").set("Accept-Encoding", "gzip");

      expect(response.status).toBe(200);
      expect(response.headers["content-encoding"]).toBe("gzip");
      expect(response.body).toEqual(largeData);
    });

    it("should not compress small JSON responses", async () => {
      const smallData = { message: "Hello World" };

      app.get("/small-json", (req, res) => {
        res.json(smallData);
      });

      const response = await request(app).get("/small-json").set("Accept-Encoding", "gzip");

      expect(response.status).toBe(200);
      expect(response.headers["content-encoding"]).toBeUndefined();
      expect(response.body).toEqual(smallData);
    });

    it("should respect x-no-compression header", async () => {
      const largeData = {
        items: Array.from({ length: 100 }, (_, i) => ({
          id: i,
          name: `Item ${i} with long name and description`,
          description:
            "This is a test item with a very long description to make the response large enough for compression testing purposes",
        })),
      };

      app.get("/large-json-no-compression", (req, res) => {
        res.json(largeData);
      });

      const response = await request(app)
        .get("/large-json-no-compression")
        .set("Accept-Encoding", "gzip")
        .set("x-no-compression", "true");

      expect(response.status).toBe(200);
      expect(response.headers["content-encoding"]).toBeUndefined();
      expect(response.body).toEqual(largeData);
    });

    it("should compress application/json content type", async () => {
      const data = {
        message:
          "This is a test message that should be long enough to trigger compression when repeated multiple times.",
        items: Array.from(
          { length: 50 },
          (_, i) => `Item ${i} with additional text to increase size`
        ),
      };

      app.get("/json-content", (req, res) => {
        res.setHeader("Content-Type", "application/json");
        res.send(JSON.stringify(data));
      });

      const response = await request(app).get("/json-content").set("Accept-Encoding", "gzip");

      expect(response.status).toBe(200);
      expect(response.headers["content-encoding"]).toBe("gzip");
      expect(JSON.parse(response.text)).toEqual(data);
    });
  });

  describe("text response compression", () => {
    it("should compress large text responses", async () => {
      const largeText = "This is a large text response. ".repeat(100);

      app.get("/large-text", (req, res) => {
        res.setHeader("Content-Type", "text/plain");
        res.send(largeText);
      });

      const response = await request(app).get("/large-text").set("Accept-Encoding", "gzip");

      expect(response.status).toBe(200);
      expect(response.headers["content-encoding"]).toBe("gzip");
      expect(response.text).toBe(largeText);
    });

    it("should compress HTML responses", async () => {
      const largeHtml = `
        <html>
          <body>
            <h1>Test Page</h1>
            ${"<p>This is a paragraph with lots of text. </p>".repeat(50)}
          </body>
        </html>
      `;

      app.get("/large-html", (req, res) => {
        res.setHeader("Content-Type", "text/html");
        res.send(largeHtml);
      });

      const response = await request(app).get("/large-html").set("Accept-Encoding", "gzip");

      expect(response.status).toBe(200);
      expect(response.headers["content-encoding"]).toBe("gzip");
      expect(response.text).toBe(largeHtml);
    });

    it("should compress CSS responses", async () => {
      const largeCss = `
        .test-class {
          color: red;
          background-color: blue;
          margin: 10px;
          padding: 5px;
        }
      `.repeat(100);

      app.get("/large-css", (req, res) => {
        res.setHeader("Content-Type", "text/css");
        res.send(largeCss);
      });

      const response = await request(app).get("/large-css").set("Accept-Encoding", "gzip");

      expect(response.status).toBe(200);
      expect(response.headers["content-encoding"]).toBe("gzip");
      expect(response.text).toBe(largeCss);
    });
  });

  describe("JavaScript response compression", () => {
    it("should compress JavaScript responses", async () => {
      const largeJs = `
        function testFunction() {
          console.log('This is a test function');
          return 'test';
        }
      `.repeat(50);

      app.get("/large-js", (req, res) => {
        res.setHeader("Content-Type", "application/javascript");
        res.send(largeJs);
      });

      const response = await request(app).get("/large-js").set("Accept-Encoding", "gzip");

      expect(response.status).toBe(200);
      expect(response.headers["content-encoding"]).toBe("gzip");
      expect(response.text).toBe(largeJs);
    });
  });

  describe("XML response compression", () => {
    it("should compress XML responses", async () => {
      const largeXml = `
        <?xml version="1.0" encoding="UTF-8"?>
        <root>
          ${"<item><name>Test Item</name><description>This is a test item</description></item>".repeat(50)}
        </root>
      `;

      app.get("/large-xml", (req, res) => {
        res.setHeader("Content-Type", "application/xml");
        res.send(largeXml);
      });

      const response = await request(app).get("/large-xml").set("Accept-Encoding", "gzip");

      expect(response.status).toBe(200);
      expect(response.headers["content-encoding"]).toBe("gzip");
      expect(response.text).toBe(largeXml);
    });
  });

  describe("non-compressible content", () => {
    it("should not compress image responses", async () => {
      // Simulate binary image data
      const imageData = Buffer.from("fake-image-data-that-is-already-compressed");

      app.get("/image", (req, res) => {
        res.setHeader("Content-Type", "image/jpeg");
        res.send(imageData);
      });

      const response = await request(app).get("/image").set("Accept-Encoding", "gzip");

      expect(response.status).toBe(200);
      expect(response.headers["content-encoding"]).toBeUndefined();
    });

    it("should not compress video responses", async () => {
      const videoData = Buffer.from("fake-video-data-that-is-already-compressed");

      app.get("/video", (req, res) => {
        res.setHeader("Content-Type", "video/mp4");
        res.send(videoData);
      });

      const response = await request(app).get("/video").set("Accept-Encoding", "gzip");

      expect(response.status).toBe(200);
      expect(response.headers["content-encoding"]).toBeUndefined();
    });

    it("should not compress unknown content types", async () => {
      const data = "Some data with unknown content type";

      app.get("/unknown", (req, res) => {
        res.setHeader("Content-Type", "application/unknown");
        res.send(data);
      });

      const response = await request(app).get("/unknown").set("Accept-Encoding", "gzip");

      expect(response.status).toBe(200);
      expect(response.headers["content-encoding"]).toBeUndefined();
    });
  });

  describe("client encoding support", () => {
    it("should not compress when client does not support gzip", async () => {
      const largeData = {
        items: Array.from({ length: 100 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          description: "This is a test item with a long description",
        })),
      };

      app.get("/no-encoding-support", (req, res) => {
        res.json(largeData);
      });

      const response = await request(app)
        .get("/no-encoding-support")
        .set("Accept-Encoding", "identity");
      // Client explicitly doesn't support compression

      expect(response.status).toBe(200);
      expect(response.headers["content-encoding"]).toBeUndefined();
      expect(response.body).toEqual(largeData);
    });

    it("should support deflate encoding", async () => {
      const largeData = {
        items: Array.from({ length: 100 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          description: "This is a test item with a long description",
        })),
      };

      app.get("/deflate-encoding", (req, res) => {
        res.json(largeData);
      });

      const response = await request(app)
        .get("/deflate-encoding")
        .set("Accept-Encoding", "deflate");

      expect(response.status).toBe(200);
      expect(response.headers["content-encoding"]).toBe("deflate");
      expect(response.body).toEqual(largeData);
    });
  });

  describe("performance considerations", () => {
    it("should handle concurrent compression requests", async () => {
      const largeData = {
        items: Array.from({ length: 100 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          description:
            "This is a test item with a long description that helps with compression testing",
        })),
      };

      app.get("/concurrent-test", (req, res) => {
        res.json(largeData);
      });

      // Make multiple concurrent requests
      const requests = Array.from({ length: 10 }, () =>
        request(app).get("/concurrent-test").set("Accept-Encoding", "gzip")
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.headers["content-encoding"]).toBe("gzip");
        expect(response.body).toEqual(largeData);
      });
    });

    it("should maintain response integrity after compression", async () => {
      const complexData = {
        unicode: "Hello 世界 🌍",
        numbers: [1, 2, 3.14159, -42],
        booleans: [true, false],
        nullValue: null,
        nested: {
          array: ["a", "b", "c"],
          object: {
            key: "value",
            special: "special characters: !@#$%^&*()",
          },
        },
        largeString: "This is a large string. ".repeat(200),
      };

      app.get("/integrity-test", (req, res) => {
        res.json(complexData);
      });

      const response = await request(app).get("/integrity-test").set("Accept-Encoding", "gzip");

      expect(response.status).toBe(200);
      expect(response.headers["content-encoding"]).toBe("gzip");
      expect(response.body).toEqual(complexData);
    });
  });

  describe("edge cases", () => {
    it("should handle empty responses", async () => {
      app.get("/empty", (req, res) => {
        res.json({});
      });

      const response = await request(app).get("/empty").set("Accept-Encoding", "gzip");

      expect(response.status).toBe(200);
      expect(response.headers["content-encoding"]).toBeUndefined();
      expect(response.body).toEqual({});
    });

    it("should handle responses at the compression threshold", async () => {
      // Create data that's exactly at the 1KB threshold
      const thresholdData = "x".repeat(1024);

      app.get("/threshold", (req, res) => {
        res.setHeader("Content-Type", "text/plain");
        res.send(thresholdData);
      });

      const response = await request(app).get("/threshold").set("Accept-Encoding", "gzip");

      expect(response.status).toBe(200);
      // At exactly 1KB, compression behavior may vary
      expect(response.text).toBe(thresholdData);
    });

    it("should handle responses without content-type", async () => {
      const data = "Some data without content type";

      app.get("/no-content-type", (req, res) => {
        res.send(data);
      });

      const response = await request(app).get("/no-content-type").set("Accept-Encoding", "gzip");

      expect(response.status).toBe(200);
      expect(response.text).toBe(data);
    });
  });
});
