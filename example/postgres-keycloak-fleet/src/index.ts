
import { FleetConfig } from "./fleetformTypes"

const fleet: FleetConfig = {
    hosts: {
    },
    container: {
        nginx_test: {
            enabled: false,
            image: "nginx",
            tag: "1.21-alpine",
            host: "local",
            networks: [
                "fleetform"
            ],
            publish: {
                "80/tcp": 80
            },
            volumes: {
                "/home/codec/majo/nginx/html": "/usr/share/nginx/html",
                "/home/codec/majo/nginx/nginx.conf": "/etc/nginx/nginx.conf",
            },
        },
    }
}

export default fleet