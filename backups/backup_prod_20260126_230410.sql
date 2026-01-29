--
-- PostgreSQL database dump
--

\restrict E4Csq2oFb0NAjUbj5HgNxrogjz8HjSPv7ysaEfD26qfOAZygE5rQkOvYo9RcFoz

-- Dumped from database version 16.11 (Debian 16.11-1.pgdg12+1)
-- Dumped by pg_dump version 16.11 (Debian 16.11-1.pgdg12+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- Name: asistencias; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.asistencias (
    id integer NOT NULL,
    usuario_id integer,
    fecha date NOT NULL,
    semana_inicio date NOT NULL,
    metodo_registro character varying(20) NOT NULL,
    estado character varying(30) DEFAULT 'pendiente_confirmacion'::character varying NOT NULL,
    confirmado_por integer,
    confirmado_at timestamp(3) without time zone,
    notas_confirmacion text,
    qr_id integer,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    datos_formulario jsonb,
    nombre_registro character varying(100),
    telefono_registro character varying(25),
    tipo_id integer
);


ALTER TABLE public.asistencias OWNER TO postgres;

--
-- Name: asistencias_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.asistencias_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.asistencias_id_seq OWNER TO postgres;

--
-- Name: asistencias_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.asistencias_id_seq OWNED BY public.asistencias.id;


--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_log (
    id integer NOT NULL,
    usuario_id integer,
    accion character varying(100) NOT NULL,
    tabla_afectada character varying(50),
    registro_id integer,
    datos_anteriores jsonb,
    datos_nuevos jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.audit_log OWNER TO postgres;

--
-- Name: audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audit_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_log_id_seq OWNER TO postgres;

--
-- Name: audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_log_id_seq OWNED BY public.audit_log.id;


--
-- Name: conversaciones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.conversaciones (
    id integer NOT NULL,
    usuario_id integer,
    telefono character varying(20) NOT NULL,
    estado character varying(50) DEFAULT 'inicio'::character varying NOT NULL,
    contexto jsonb DEFAULT '{}'::jsonb NOT NULL,
    modulo_activo character varying(50),
    programa_en_edicion integer,
    ultimo_mensaje_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.conversaciones OWNER TO postgres;

--
-- Name: conversaciones_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.conversaciones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.conversaciones_id_seq OWNER TO postgres;

--
-- Name: conversaciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.conversaciones_id_seq OWNED BY public.conversaciones.id;


--
-- Name: formulario_campos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.formulario_campos (
    id integer NOT NULL,
    tipo_asistencia_id integer NOT NULL,
    nombre character varying(50) NOT NULL,
    label character varying(100) NOT NULL,
    tipo character varying(30) NOT NULL,
    requerido boolean DEFAULT false NOT NULL,
    orden integer DEFAULT 0 NOT NULL,
    placeholder character varying(100),
    valor_minimo integer,
    valor_maximo integer,
    opciones jsonb,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.formulario_campos OWNER TO postgres;

--
-- Name: formulario_campos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.formulario_campos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.formulario_campos_id_seq OWNER TO postgres;

--
-- Name: formulario_campos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.formulario_campos_id_seq OWNED BY public.formulario_campos.id;


--
-- Name: mensajes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mensajes (
    id integer NOT NULL,
    conversacion_id integer NOT NULL,
    direccion character varying(10) NOT NULL,
    contenido text NOT NULL,
    tipo character varying(20) DEFAULT 'texto'::character varying NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.mensajes OWNER TO postgres;

--
-- Name: mensajes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.mensajes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.mensajes_id_seq OWNER TO postgres;

--
-- Name: mensajes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.mensajes_id_seq OWNED BY public.mensajes.id;


--
-- Name: notificaciones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notificaciones (
    id integer NOT NULL,
    usuario_id integer,
    telefono character varying(20) NOT NULL,
    tipo character varying(50) NOT NULL,
    mensaje text NOT NULL,
    programa_id integer,
    estado character varying(20) DEFAULT 'pendiente'::character varying NOT NULL,
    enviado_at timestamp(3) without time zone,
    error_mensaje text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.notificaciones OWNER TO postgres;

--
-- Name: notificaciones_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notificaciones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notificaciones_id_seq OWNER TO postgres;

--
-- Name: notificaciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notificaciones_id_seq OWNED BY public.notificaciones.id;


--
-- Name: partes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.partes (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text,
    orden integer NOT NULL,
    es_fija boolean DEFAULT false NOT NULL,
    texto_fijo character varying(100),
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    es_obligatoria boolean DEFAULT false NOT NULL
);


ALTER TABLE public.partes OWNER TO postgres;

--
-- Name: partes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.partes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.partes_id_seq OWNER TO postgres;

--
-- Name: partes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.partes_id_seq OWNED BY public.partes.id;


--
-- Name: programa_asignaciones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.programa_asignaciones (
    id integer NOT NULL,
    programa_id integer NOT NULL,
    parte_id integer NOT NULL,
    usuario_id integer,
    orden integer DEFAULT 1 NOT NULL,
    notificado boolean DEFAULT false NOT NULL,
    notificado_at timestamp(3) without time zone,
    confirmado boolean DEFAULT false NOT NULL,
    confirmado_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    nombre_libre character varying(100)
);


ALTER TABLE public.programa_asignaciones OWNER TO postgres;

--
-- Name: programa_asignaciones_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.programa_asignaciones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.programa_asignaciones_id_seq OWNER TO postgres;

--
-- Name: programa_asignaciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.programa_asignaciones_id_seq OWNED BY public.programa_asignaciones.id;


--
-- Name: programa_links; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.programa_links (
    id integer NOT NULL,
    programa_id integer NOT NULL,
    parte_id integer NOT NULL,
    nombre character varying(200) NOT NULL,
    url text NOT NULL,
    orden integer DEFAULT 1 NOT NULL,
    agregado_por integer,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.programa_links OWNER TO postgres;

--
-- Name: programa_links_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.programa_links_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.programa_links_id_seq OWNER TO postgres;

--
-- Name: programa_links_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.programa_links_id_seq OWNED BY public.programa_links.id;


--
-- Name: programa_partes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.programa_partes (
    id integer NOT NULL,
    programa_id integer NOT NULL,
    parte_id integer NOT NULL,
    orden integer NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.programa_partes OWNER TO postgres;

--
-- Name: programa_partes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.programa_partes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.programa_partes_id_seq OWNER TO postgres;

--
-- Name: programa_partes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.programa_partes_id_seq OWNED BY public.programa_partes.id;


--
-- Name: programas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.programas (
    id integer NOT NULL,
    fecha date NOT NULL,
    titulo character varying(200) DEFAULT 'Programa Maranatha Adoración'::character varying NOT NULL,
    estado character varying(20) DEFAULT 'borrador'::character varying NOT NULL,
    texto_generado text,
    creado_por integer,
    enviado_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    codigo character varying(20),
    hora_inicio time without time zone,
    hora_fin time without time zone
);


ALTER TABLE public.programas OWNER TO postgres;

--
-- Name: programas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.programas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.programas_id_seq OWNER TO postgres;

--
-- Name: programas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.programas_id_seq OWNED BY public.programas.id;


--
-- Name: qr_asistencia; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.qr_asistencia (
    id integer NOT NULL,
    semana_inicio date NOT NULL,
    codigo character varying(50) NOT NULL,
    descripcion character varying(200),
    url_generada text,
    activo boolean DEFAULT true NOT NULL,
    hora_inicio time without time zone DEFAULT '09:00:00'::time without time zone NOT NULL,
    hora_fin time without time zone DEFAULT '12:00:00'::time without time zone NOT NULL,
    created_by integer,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tipo_id integer
);


ALTER TABLE public.qr_asistencia OWNER TO postgres;

--
-- Name: qr_asistencia_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.qr_asistencia_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.qr_asistencia_id_seq OWNER TO postgres;

--
-- Name: qr_asistencia_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.qr_asistencia_id_seq OWNED BY public.qr_asistencia.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    nombre character varying(50) NOT NULL,
    descripcion text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: tipos_asistencia; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tipos_asistencia (
    id integer NOT NULL,
    nombre character varying(50) NOT NULL,
    label character varying(100) NOT NULL,
    descripcion character varying(255),
    icono character varying(50),
    color character varying(20),
    solo_presencia boolean DEFAULT false NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    orden integer DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.tipos_asistencia OWNER TO postgres;

--
-- Name: tipos_asistencia_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tipos_asistencia_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tipos_asistencia_id_seq OWNER TO postgres;

--
-- Name: tipos_asistencia_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tipos_asistencia_id_seq OWNED BY public.tipos_asistencia.id;


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuarios (
    id integer NOT NULL,
    codigo_pais character varying(5) DEFAULT '51'::character varying NOT NULL,
    telefono character varying(20) NOT NULL,
    password_hash character varying(255) NOT NULL,
    nombre character varying(100) NOT NULL,
    nombre_whatsapp character varying(100),
    email character varying(100),
    activo boolean DEFAULT true NOT NULL,
    debe_cambiar_password boolean DEFAULT true NOT NULL,
    ultimo_login timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    foto_url character varying(500),
    fecha_nacimiento date,
    direccion character varying(200),
    biografia text,
    genero character varying(20)
);


ALTER TABLE public.usuarios OWNER TO postgres;

--
-- Name: usuarios_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.usuarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.usuarios_id_seq OWNER TO postgres;

--
-- Name: usuarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.usuarios_id_seq OWNED BY public.usuarios.id;


--
-- Name: usuarios_partes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuarios_partes (
    id integer NOT NULL,
    usuario_id integer NOT NULL,
    parte_id integer NOT NULL,
    ultima_participacion date,
    total_participaciones integer DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.usuarios_partes OWNER TO postgres;

--
-- Name: usuarios_partes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.usuarios_partes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.usuarios_partes_id_seq OWNER TO postgres;

--
-- Name: usuarios_partes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.usuarios_partes_id_seq OWNED BY public.usuarios_partes.id;


--
-- Name: usuarios_roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuarios_roles (
    id integer NOT NULL,
    usuario_id integer NOT NULL,
    rol_id integer NOT NULL,
    asignado_por integer,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.usuarios_roles OWNER TO postgres;

--
-- Name: usuarios_roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.usuarios_roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.usuarios_roles_id_seq OWNER TO postgres;

--
-- Name: usuarios_roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.usuarios_roles_id_seq OWNED BY public.usuarios_roles.id;


--
-- Name: asistencias id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asistencias ALTER COLUMN id SET DEFAULT nextval('public.asistencias_id_seq'::regclass);


--
-- Name: audit_log id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_log ALTER COLUMN id SET DEFAULT nextval('public.audit_log_id_seq'::regclass);


--
-- Name: conversaciones id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversaciones ALTER COLUMN id SET DEFAULT nextval('public.conversaciones_id_seq'::regclass);


--
-- Name: formulario_campos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.formulario_campos ALTER COLUMN id SET DEFAULT nextval('public.formulario_campos_id_seq'::regclass);


--
-- Name: mensajes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mensajes ALTER COLUMN id SET DEFAULT nextval('public.mensajes_id_seq'::regclass);


--
-- Name: notificaciones id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notificaciones ALTER COLUMN id SET DEFAULT nextval('public.notificaciones_id_seq'::regclass);


--
-- Name: partes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.partes ALTER COLUMN id SET DEFAULT nextval('public.partes_id_seq'::regclass);


--
-- Name: programa_asignaciones id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.programa_asignaciones ALTER COLUMN id SET DEFAULT nextval('public.programa_asignaciones_id_seq'::regclass);


--
-- Name: programa_links id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.programa_links ALTER COLUMN id SET DEFAULT nextval('public.programa_links_id_seq'::regclass);


--
-- Name: programa_partes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.programa_partes ALTER COLUMN id SET DEFAULT nextval('public.programa_partes_id_seq'::regclass);


--
-- Name: programas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.programas ALTER COLUMN id SET DEFAULT nextval('public.programas_id_seq'::regclass);


--
-- Name: qr_asistencia id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.qr_asistencia ALTER COLUMN id SET DEFAULT nextval('public.qr_asistencia_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: tipos_asistencia id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tipos_asistencia ALTER COLUMN id SET DEFAULT nextval('public.tipos_asistencia_id_seq'::regclass);


--
-- Name: usuarios id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios ALTER COLUMN id SET DEFAULT nextval('public.usuarios_id_seq'::regclass);


--
-- Name: usuarios_partes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios_partes ALTER COLUMN id SET DEFAULT nextval('public.usuarios_partes_id_seq'::regclass);


--
-- Name: usuarios_roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios_roles ALTER COLUMN id SET DEFAULT nextval('public.usuarios_roles_id_seq'::regclass);


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
72bce67f-d2fb-46a6-8260-18ab74f33af7	a5eda3fe192aae63613d01a3fe44ba4718141c0b9de52c0165fc6c0da8ff98f7	2026-01-24 11:36:06.204209+00	20260120034947_init	\N	\N	2026-01-24 11:36:05.776273+00	1
a8dbd45b-16fb-48ab-b24d-f5070bb884c4	db85e3ac6bece9059d7011e75b7ae7c4bc3901c42213dfd81a1ecb38a9826d84	2026-01-24 11:36:06.231576+00	20260120035110_remove_telefono_anterior	\N	\N	2026-01-24 11:36:06.207639+00	1
8bfbcb91-9df9-485f-bf42-be19e1ba7698	2c7344aa939dc8b962083e20f081c8845deed1ec629d341f1f7b68aaf418ae94	2026-01-24 11:36:06.256571+00	20260120152251_init	\N	\N	2026-01-24 11:36:06.239397+00	1
e4f72aa4-c20d-41b9-a18d-219c243bc8aa	db8e15cb12735ed8f93aaef01f559f052fd4c2ec5a84aa0a20750fe51ee4ccc8	2026-01-24 11:36:06.31245+00	20260120174901_add_programa_partes	\N	\N	2026-01-24 11:36:06.260135+00	1
b51dc398-923f-4dae-8c27-58f376120dc7	3aa7de381317b27ce886626dcb012491b1f46a78d8dc6e771cda6af2a1b7cb85	2026-01-24 11:36:06.390389+00	20260121190000_add_tipos_asistencia_and_nombre_libre	\N	\N	2026-01-24 11:36:06.319034+00	1
5c672b46-066b-4e13-97b0-ef1cd064317f	d26fd32049e5cdcbf7d7b3acf8f3a06ec57949ee6b582cda53c9cbac954b240a	2026-01-27 03:18:15.400443+00	20260126000000_add_programa_columns	\N	\N	2026-01-27 03:18:15.355927+00	1
\.


--
-- Data for Name: asistencias; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.asistencias (id, usuario_id, fecha, semana_inicio, metodo_registro, estado, confirmado_por, confirmado_at, notas_confirmacion, qr_id, created_at, datos_formulario, nombre_registro, telefono_registro, tipo_id) FROM stdin;
1	1	2026-01-24	2026-01-24	qr_bot	confirmado	1	2026-01-24 12:29:36.531	\N	1	2026-01-24 12:29:23.745	{"dias_estudio": 5, "estudio_biblico": false}	Jorge Luis Vasquez	51940393758	1
2	23	2026-01-24	2026-01-24	qr_bot	confirmado	1	2026-01-24 14:19:25.131	\N	1	2026-01-24 14:18:48.903	{"dias_estudio": 7, "estudio_biblico": false}	moyjose25	51996160566	1
8	\N	2026-01-24	2026-01-24	manual	confirmado	1	2026-01-24 14:52:51.908	\N	1	2026-01-24 14:52:51.91	{"dias_estudio": 7, "estudio_biblico": true}	Nilson	901737522	1
9	\N	2026-01-24	2026-01-24	manual	confirmado	1	2026-01-24 14:53:45.222	\N	1	2026-01-24 14:53:45.223	{"dias_estudio": 7, "estudio_biblico": false}	Cristhian	928692860	1
11	27	2026-01-24	2026-01-24	manual	confirmado	1	2026-01-24 14:54:30.582	\N	1	2026-01-24 14:54:30.583	{"dias_estudio": 6, "estudio_biblico": false}	\N	\N	1
10	\N	2026-01-24	2026-01-24	qr_bot	confirmado	1	2026-01-24 14:55:16.774	\N	1	2026-01-24 14:54:01.022	{"dias_estudio": 6, "estudio_biblico": false}	William	51970332361	1
7	28	2026-01-24	2026-01-24	qr_bot	confirmado	1	2026-01-24 14:55:17.579	\N	1	2026-01-24 14:52:41.178	{"dias_estudio": 7, "estudio_biblico": false}	Niki	51990134132	1
6	7	2026-01-24	2026-01-24	qr_bot	confirmado	1	2026-01-24 14:55:18.531	\N	1	2026-01-24 14:52:39.037	{"dias_estudio": 7, "estudio_biblico": false}	Anyela💖	51993803296	1
5	\N	2026-01-24	2026-01-24	qr_bot	confirmado	1	2026-01-24 14:55:19.601	\N	1	2026-01-24 14:52:35.59	{"dias_estudio": 7, "estudio_biblico": false}	JC	51944469639	1
4	\N	2026-01-24	2026-01-24	qr_bot	confirmado	1	2026-01-24 14:55:20.988	\N	1	2026-01-24 14:52:27.686	{"dias_estudio": 6, "estudio_biblico": true}	Almendra Solórzano Chang	51994068967	1
3	26	2026-01-24	2026-01-24	qr_bot	confirmado	1	2026-01-24 14:55:21.946	\N	1	2026-01-24 14:51:30.414	{"dias_estudio": 7, "estudio_biblico": false}	Fanny Calderon	51963895061	1
12	9	2026-01-24	2026-01-24	qr_bot	confirmado	1	2026-01-24 18:08:23.627	\N	1	2026-01-24 18:08:11.283	{"dias_estudio": 6, "estudio_biblico": false}	I. Pamela 😎	51984121155	1
13	19	2026-01-24	2026-01-24	qr_bot	confirmado	1	2026-01-24 18:11:05.048	\N	1	2026-01-24 18:10:48.94	{"dias_estudio": 0, "estudio_biblico": false}	A. PATRICIA⚡🌱	51927934296	1
14	5	2026-01-24	2026-01-24	qr_bot	confirmado	1	2026-01-24 18:12:57.763	\N	1	2026-01-24 18:11:40.403	{"dias_estudio": 7, "estudio_biblico": false}	Jean	51932287482	1
15	10	2026-01-24	2026-01-24	qr_bot	confirmado	1	2026-01-24 18:13:25.023	\N	1	2026-01-24 18:13:11.355	{"dias_estudio": 3, "estudio_biblico": false}	Beeel	51933714369	1
17	25	2026-01-24	2026-01-24	qr_bot	confirmado	1	2026-01-25 00:50:27.285	\N	1	2026-01-24 18:14:28.021	{"dias_estudio": 1, "estudio_biblico": false}	Zelo🤠 Lee	51975662737	1
16	32	2026-01-24	2026-01-24	qr_bot	confirmado	1	2026-01-25 00:50:30.423	\N	1	2026-01-24 18:14:01.515	{"dias_estudio": 2, "estudio_biblico": false}	Annie Chávez	51902098838	1
\.


--
-- Data for Name: audit_log; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_log (id, usuario_id, accion, tabla_afectada, registro_id, datos_anteriores, datos_nuevos, created_at) FROM stdin;
\.


--
-- Data for Name: conversaciones; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.conversaciones (id, usuario_id, telefono, estado, contexto, modulo_activo, programa_en_edicion, ultimo_mensaje_at, created_at, updated_at) FROM stdin;
7	\N	51944469639	inicio	{}	\N	\N	2026-01-24 14:52:36.178	2026-01-24 14:52:07.223	2026-01-24 14:52:36.179
1	1	51940393758	inicio	{}	\N	\N	2026-01-24 12:29:24.346	2026-01-24 12:29:07.671	2026-01-24 12:29:24.347
6	\N	51994068967	inicio	{}	\N	\N	2026-01-24 14:52:28.182	2026-01-24 14:52:04.289	2026-01-24 14:52:28.183
2	23	51996160566	inicio	{}	\N	\N	2026-01-24 14:18:49.431	2026-01-24 14:18:25.388	2026-01-24 14:18:49.432
9	9	51984121155	inicio	{}	\N	\N	2026-01-24 18:08:11.902	2026-01-24 18:07:42.957	2026-01-24 18:08:11.904
3	26	51963895061	inicio	{}	\N	\N	2026-01-24 14:51:30.99	2026-01-24 14:51:11.663	2026-01-24 14:51:30.991
5	7	51993803296	inicio	{}	\N	\N	2026-01-24 14:52:39.626	2026-01-24 14:51:57.35	2026-01-24 14:52:39.627
8	28	51990134132	inicio	{}	\N	\N	2026-01-24 14:52:41.546	2026-01-24 14:52:14.114	2026-01-24 14:52:41.547
12	25	51975662737	inicio	{}	\N	\N	2026-01-24 18:14:28.411	2026-01-24 18:12:05.801	2026-01-24 18:14:28.412
10	19	51927934296	inicio	{}	\N	\N	2026-01-24 18:10:49.458	2026-01-24 18:10:25.06	2026-01-24 18:10:49.459
4	\N	51970332361	inicio	{}	\N	\N	2026-01-24 14:54:01.709	2026-01-24 14:51:32.77	2026-01-24 14:54:01.71
11	5	51932287482	inicio	{}	\N	\N	2026-01-24 18:11:40.9	2026-01-24 18:11:12.26	2026-01-24 18:11:40.901
14	10	51933714369	inicio	{}	\N	\N	2026-01-24 18:13:11.878	2026-01-24 18:12:57.294	2026-01-24 18:13:11.879
13	32	51902098838	inicio	{}	\N	\N	2026-01-24 18:14:02.024	2026-01-24 18:12:30.115	2026-01-24 18:14:02.025
\.


--
-- Data for Name: formulario_campos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.formulario_campos (id, tipo_asistencia_id, nombre, label, tipo, requerido, orden, placeholder, valor_minimo, valor_maximo, opciones, activo, created_at) FROM stdin;
1	1	dias_estudio	Días de estudio de lección	number	f	1	¿Cuántos días estudiaste la lección?	0	7	\N	t	2026-01-24 11:36:41.322
2	1	estudio_biblico	¿Hizo estudio bíblico esta semana?	checkbox	f	2	\N	\N	\N	\N	t	2026-01-24 11:36:41.336
\.


--
-- Data for Name: mensajes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.mensajes (id, conversacion_id, direccion, contenido, tipo, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: notificaciones; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notificaciones (id, usuario_id, telefono, tipo, mensaje, programa_id, estado, enviado_at, error_mensaje, created_at) FROM stdin;
\.


--
-- Data for Name: partes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.partes (id, nombre, descripcion, orden, es_fija, texto_fijo, activo, created_at, es_obligatoria) FROM stdin;
1	Bienvenida	\N	1	f	\N	t	2026-01-24 11:36:07.988	t
2	Oración Inicial	\N	2	f	\N	t	2026-01-24 11:36:07.999	t
3	Espacio de Cantos	\N	3	f	\N	t	2026-01-24 11:36:08.008	t
4	Oración Intercesora	\N	4	f	\N	t	2026-01-24 11:36:08.018	f
5	Reavivados	\N	5	f	\N	t	2026-01-24 11:36:08.026	f
6	Tema	\N	6	f	\N	t	2026-01-24 11:36:08.037	t
7	Notijoven	\N	7	f	\N	t	2026-01-24 11:36:08.043	f
8	Dinámica	\N	8	f	\N	t	2026-01-24 11:36:08.052	f
9	Testimonio	\N	9	f	\N	t	2026-01-24 11:36:08.061	f
10	Especial	\N	10	f	\N	t	2026-01-24 11:36:08.068	f
11	Recojo de Ofrendas	\N	11	t	Diáconos	t	2026-01-24 11:36:08.077	t
12	Himno Final	\N	12	f	\N	t	2026-01-24 11:36:08.087	t
13	Oración Final	\N	13	f	\N	t	2026-01-24 11:36:08.094	t
\.


--
-- Data for Name: programa_asignaciones; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.programa_asignaciones (id, programa_id, parte_id, usuario_id, orden, notificado, notificado_at, confirmado, confirmado_at, created_at, nombre_libre) FROM stdin;
\.


--
-- Data for Name: programa_links; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.programa_links (id, programa_id, parte_id, nombre, url, orden, agregado_por, created_at) FROM stdin;
\.


--
-- Data for Name: programa_partes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.programa_partes (id, programa_id, parte_id, orden, created_at) FROM stdin;
\.


--
-- Data for Name: programas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.programas (id, fecha, titulo, estado, texto_generado, creado_por, enviado_at, created_at, updated_at, codigo, hora_inicio, hora_fin) FROM stdin;
\.


--
-- Data for Name: qr_asistencia; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.qr_asistencia (id, semana_inicio, codigo, descripcion, url_generada, activo, hora_inicio, hora_fin, created_by, created_at, tipo_id) FROM stdin;
1	2026-01-24	JA-5394949A	prueba	/asistencia/JA-5394949A	t	05:00:00	23:00:00	1	2026-01-24 11:40:22.269	1
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (id, nombre, descripcion, created_at) FROM stdin;
1	admin	Administrador del sistema - puede todo	2026-01-24 11:36:07.832
2	lider	Líder JA - puede armar programas y ver reportes	2026-01-24 11:36:07.834
3	participante	Miembro del grupo - participa en programas	2026-01-24 11:36:07.834
\.


--
-- Data for Name: tipos_asistencia; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tipos_asistencia (id, nombre, label, descripcion, icono, color, solo_presencia, activo, orden, created_at, updated_at) FROM stdin;
1	escuela_sabatica	Escuela Sabática	Registro de asistencia a Escuela Sabática	BookOpen	#3B82F6	f	t	1	2026-01-24 11:36:41.303	2026-01-27 04:01:15.015
2	programa_ja	Programa JA	Registro de asistencia a Programa de Jóvenes Adventistas	Users	#10B981	t	t	2	2026-01-24 11:36:41.342	2026-01-27 04:01:15.031
3	gp	Grupo Pequeño	Registro de asistencia a Grupo Pequeño	Home	#F59E0B	t	t	3	2026-01-24 11:36:41.352	2026-01-27 04:01:15.036
\.


--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.usuarios (id, codigo_pais, telefono, password_hash, nombre, nombre_whatsapp, email, activo, debe_cambiar_password, ultimo_login, created_at, updated_at, foto_url, fecha_nacimiento, direccion, biografia, genero) FROM stdin;
28	51	990134132	$2b$10$JznYWdF6JWxVe7C05YVXNuiYCpsHdDSIKYyyqX0JuhE3OcMAziEoa	Nicole Castro	\N	\N	t	t	\N	2026-01-24 11:36:41.166	2026-01-27 04:01:14.981	\N	\N	\N	\N	\N
29	51	976203046	$2b$10$JznYWdF6JWxVe7C05YVXNuiYCpsHdDSIKYyyqX0JuhE3OcMAziEoa	Xavier	\N	\N	t	t	\N	2026-01-24 11:36:41.193	2026-01-27 04:01:14.986	\N	\N	\N	\N	\N
10	51	933714369	$2b$10$JznYWdF6JWxVe7C05YVXNuiYCpsHdDSIKYyyqX0JuhE3OcMAziEoa	Belen Diaz	\N	\N	t	t	\N	2026-01-24 11:36:40.651	2026-01-27 04:01:14.86	\N	\N	\N	\N	\N
11	51	945388949	$2b$10$JznYWdF6JWxVe7C05YVXNuiYCpsHdDSIKYyyqX0JuhE3OcMAziEoa	Renzo Higinio	\N	\N	t	t	\N	2026-01-24 11:36:40.678	2026-01-27 04:01:14.866	\N	\N	\N	\N	\N
12	51	949125725	$2b$10$JznYWdF6JWxVe7C05YVXNuiYCpsHdDSIKYyyqX0JuhE3OcMAziEoa	Liz Delgado	\N	\N	t	t	\N	2026-01-24 11:36:40.709	2026-01-27 04:01:14.872	\N	\N	\N	\N	\N
30	51	954764679	$2b$10$JznYWdF6JWxVe7C05YVXNuiYCpsHdDSIKYyyqX0JuhE3OcMAziEoa	Lucia	\N	\N	t	t	\N	2026-01-24 11:36:41.218	2026-01-27 04:01:14.992	\N	\N	\N	\N	\N
31	51	939494403	$2b$10$JznYWdF6JWxVe7C05YVXNuiYCpsHdDSIKYyyqX0JuhE3OcMAziEoa	Alex	\N	\N	t	t	\N	2026-01-24 11:36:41.245	2026-01-27 04:01:15.002	\N	\N	\N	\N	\N
13	51	991157405	$2b$10$JznYWdF6JWxVe7C05YVXNuiYCpsHdDSIKYyyqX0JuhE3OcMAziEoa	Carla Delgado	\N	\N	t	t	\N	2026-01-24 11:36:40.735	2026-01-27 04:01:14.878	\N	\N	\N	\N	\N
14	51	991018759	$2b$10$JznYWdF6JWxVe7C05YVXNuiYCpsHdDSIKYyyqX0JuhE3OcMAziEoa	Kelly Delgado	\N	\N	t	t	\N	2026-01-24 11:36:40.774	2026-01-27 04:01:14.883	\N	\N	\N	\N	\N
15	51	987622613	$2b$10$JznYWdF6JWxVe7C05YVXNuiYCpsHdDSIKYyyqX0JuhE3OcMAziEoa	Cristhian Ramirez	\N	\N	t	t	\N	2026-01-24 11:36:40.808	2026-01-27 04:01:14.901	\N	\N	\N	\N	\N
16	51	994727249	$2b$10$JznYWdF6JWxVe7C05YVXNuiYCpsHdDSIKYyyqX0JuhE3OcMAziEoa	Jherson Flores	\N	\N	t	t	\N	2026-01-24 11:36:40.835	2026-01-27 04:01:14.907	\N	\N	\N	\N	\N
17	51	966750219	$2b$10$JznYWdF6JWxVe7C05YVXNuiYCpsHdDSIKYyyqX0JuhE3OcMAziEoa	Milca Humpiri	\N	\N	t	t	\N	2026-01-24 11:36:40.866	2026-01-27 04:01:14.914	\N	\N	\N	\N	\N
18	51	951212662	$2b$10$JznYWdF6JWxVe7C05YVXNuiYCpsHdDSIKYyyqX0JuhE3OcMAziEoa	Gina Mamani	\N	\N	t	t	\N	2026-01-24 11:36:40.897	2026-01-27 04:01:14.921	\N	\N	\N	\N	\N
19	51	927934296	$2b$10$JznYWdF6JWxVe7C05YVXNuiYCpsHdDSIKYyyqX0JuhE3OcMAziEoa	Patricia Tola	\N	\N	t	t	\N	2026-01-24 11:36:40.929	2026-01-27 04:01:14.927	\N	\N	\N	\N	\N
20	51	993211474	$2b$10$JznYWdF6JWxVe7C05YVXNuiYCpsHdDSIKYyyqX0JuhE3OcMAziEoa	Milli	\N	\N	t	t	\N	2026-01-24 11:36:40.955	2026-01-27 04:01:14.934	\N	\N	\N	\N	\N
21	51	951360200	$2b$10$JznYWdF6JWxVe7C05YVXNuiYCpsHdDSIKYyyqX0JuhE3OcMAziEoa	Irene	\N	\N	t	t	\N	2026-01-24 11:36:40.981	2026-01-27 04:01:14.939	\N	\N	\N	\N	\N
22	51	932722857	$2b$10$JznYWdF6JWxVe7C05YVXNuiYCpsHdDSIKYyyqX0JuhE3OcMAziEoa	Diego	\N	\N	t	t	\N	2026-01-24 11:36:41.005	2026-01-27 04:01:14.946	\N	\N	\N	\N	\N
23	51	996160566	$2b$10$JznYWdF6JWxVe7C05YVXNuiYCpsHdDSIKYyyqX0JuhE3OcMAziEoa	Jose Olivera	\N	\N	t	t	\N	2026-01-24 11:36:41.033	2026-01-27 04:01:14.952	\N	\N	\N	\N	\N
24	51	997170847	$2b$10$JznYWdF6JWxVe7C05YVXNuiYCpsHdDSIKYyyqX0JuhE3OcMAziEoa	Fernanda Quinto	\N	\N	t	t	\N	2026-01-24 11:36:41.059	2026-01-27 04:01:14.958	\N	\N	\N	\N	\N
25	51	975662737	$2b$10$JznYWdF6JWxVe7C05YVXNuiYCpsHdDSIKYyyqX0JuhE3OcMAziEoa	Zelo	\N	\N	t	t	\N	2026-01-24 11:36:41.085	2026-01-27 04:01:14.964	\N	\N	\N	\N	\N
26	51	963895061	$2b$10$JznYWdF6JWxVe7C05YVXNuiYCpsHdDSIKYyyqX0JuhE3OcMAziEoa	Fanny Calderon	\N	\N	t	t	\N	2026-01-24 11:36:41.115	2026-01-27 04:01:14.969	\N	\N	\N	\N	\N
32	51	902098838	$2b$10$JznYWdF6JWxVe7C05YVXNuiYCpsHdDSIKYyyqX0JuhE3OcMAziEoa	Annie Chavez	\N	\N	t	t	\N	2026-01-24 11:36:41.278	2026-01-27 04:01:15.009	\N	\N	\N	\N	\N
1	51	940393758	$2b$10$JznYWdF6JWxVe7C05YVXNuiYCpsHdDSIKYyyqX0JuhE3OcMAziEoa	Jorge Vasquez	\N	\N	t	f	2026-01-24 11:56:26.301	2026-01-24 11:36:40.378	2026-01-27 04:01:14.791	\N	\N	\N	\N	\N
2	51	928801948	$2b$10$JznYWdF6JWxVe7C05YVXNuiYCpsHdDSIKYyyqX0JuhE3OcMAziEoa	Damaris	\N	\N	t	t	\N	2026-01-24 11:36:40.424	2026-01-27 04:01:14.81	\N	\N	\N	\N	\N
3	51	962236060	$2b$10$JznYWdF6JWxVe7C05YVXNuiYCpsHdDSIKYyyqX0JuhE3OcMAziEoa	Elizabhet Bolaños	\N	\N	t	t	\N	2026-01-24 11:36:40.459	2026-01-27 04:01:14.816	\N	\N	\N	\N	\N
4	51	957679148	$2b$10$JznYWdF6JWxVe7C05YVXNuiYCpsHdDSIKYyyqX0JuhE3OcMAziEoa	Piedad Rivera	\N	\N	t	t	\N	2026-01-24 11:36:40.487	2026-01-27 04:01:14.823	\N	\N	\N	\N	\N
5	51	932287482	$2b$10$JznYWdF6JWxVe7C05YVXNuiYCpsHdDSIKYyyqX0JuhE3OcMAziEoa	Jean Caso	\N	\N	t	t	\N	2026-01-24 11:36:40.511	2026-01-27 04:01:14.829	\N	\N	\N	\N	\N
6	51	963033161	$2b$10$JznYWdF6JWxVe7C05YVXNuiYCpsHdDSIKYyyqX0JuhE3OcMAziEoa	Ruth Diaz	\N	\N	t	t	\N	2026-01-24 11:36:40.541	2026-01-27 04:01:14.835	\N	\N	\N	\N	\N
7	51	993803296	$2b$10$JznYWdF6JWxVe7C05YVXNuiYCpsHdDSIKYyyqX0JuhE3OcMAziEoa	Anyela Calle	\N	\N	t	t	\N	2026-01-24 11:36:40.569	2026-01-27 04:01:14.841	\N	\N	\N	\N	\N
8	51	970508614	$2b$10$JznYWdF6JWxVe7C05YVXNuiYCpsHdDSIKYyyqX0JuhE3OcMAziEoa	Bryan Chavez	\N	\N	t	t	\N	2026-01-24 11:36:40.593	2026-01-27 04:01:14.848	\N	\N	\N	\N	\N
9	51	984121155	$2b$10$JznYWdF6JWxVe7C05YVXNuiYCpsHdDSIKYyyqX0JuhE3OcMAziEoa	Pamela Maldonado	\N	\N	t	t	\N	2026-01-24 11:36:40.623	2026-01-27 04:01:14.854	\N	\N	\N	\N	\N
27	51	966386930	$2b$10$JznYWdF6JWxVe7C05YVXNuiYCpsHdDSIKYyyqX0JuhE3OcMAziEoa	Yuxy	\N	\N	t	t	\N	2026-01-24 11:36:41.139	2026-01-27 04:01:14.975	\N	\N	\N	\N	\N
\.


--
-- Data for Name: usuarios_partes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.usuarios_partes (id, usuario_id, parte_id, ultima_participacion, total_participaciones, created_at) FROM stdin;
\.


--
-- Data for Name: usuarios_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.usuarios_roles (id, usuario_id, rol_id, asignado_por, created_at) FROM stdin;
1	1	1	\N	2026-01-24 11:36:40.407
2	2	3	\N	2026-01-24 11:36:40.441
3	3	3	\N	2026-01-24 11:36:40.472
4	4	3	\N	2026-01-24 11:36:40.497
5	5	3	\N	2026-01-24 11:36:40.527
6	6	3	\N	2026-01-24 11:36:40.551
7	7	3	\N	2026-01-24 11:36:40.58
8	8	3	\N	2026-01-24 11:36:40.608
9	9	3	\N	2026-01-24 11:36:40.636
10	10	3	\N	2026-01-24 11:36:40.665
11	11	3	\N	2026-01-24 11:36:40.691
12	12	3	\N	2026-01-24 11:36:40.721
13	13	3	\N	2026-01-24 11:36:40.747
14	14	3	\N	2026-01-24 11:36:40.793
15	15	3	\N	2026-01-24 11:36:40.821
16	16	3	\N	2026-01-24 11:36:40.85
17	17	3	\N	2026-01-24 11:36:40.88
18	18	3	\N	2026-01-24 11:36:40.91
19	19	3	\N	2026-01-24 11:36:40.942
20	20	3	\N	2026-01-24 11:36:40.965
21	21	3	\N	2026-01-24 11:36:40.992
22	22	3	\N	2026-01-24 11:36:41.02
23	23	3	\N	2026-01-24 11:36:41.043
24	24	3	\N	2026-01-24 11:36:41.07
25	25	3	\N	2026-01-24 11:36:41.097
26	26	3	\N	2026-01-24 11:36:41.125
27	27	3	\N	2026-01-24 11:36:41.153
28	28	3	\N	2026-01-24 11:36:41.178
29	29	3	\N	2026-01-24 11:36:41.204
30	30	3	\N	2026-01-24 11:36:41.231
31	31	3	\N	2026-01-24 11:36:41.263
32	32	3	\N	2026-01-24 11:36:41.287
\.


--
-- Name: asistencias_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.asistencias_id_seq', 17, true);


--
-- Name: audit_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.audit_log_id_seq', 1, false);


--
-- Name: conversaciones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.conversaciones_id_seq', 14, true);


--
-- Name: formulario_campos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.formulario_campos_id_seq', 2, true);


--
-- Name: mensajes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.mensajes_id_seq', 1, false);


--
-- Name: notificaciones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notificaciones_id_seq', 1, false);


--
-- Name: partes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.partes_id_seq', 156, true);


--
-- Name: programa_asignaciones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.programa_asignaciones_id_seq', 1, false);


--
-- Name: programa_links_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.programa_links_id_seq', 1, false);


--
-- Name: programa_partes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.programa_partes_id_seq', 1, false);


--
-- Name: programas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.programas_id_seq', 1, false);


--
-- Name: qr_asistencia_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.qr_asistencia_id_seq', 1, true);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.roles_id_seq', 3, true);


--
-- Name: tipos_asistencia_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tipos_asistencia_id_seq', 30, true);


--
-- Name: usuarios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.usuarios_id_seq', 320, true);


--
-- Name: usuarios_partes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.usuarios_partes_id_seq', 1, false);


--
-- Name: usuarios_roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.usuarios_roles_id_seq', 32, true);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: asistencias asistencias_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asistencias
    ADD CONSTRAINT asistencias_pkey PRIMARY KEY (id);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: conversaciones conversaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversaciones
    ADD CONSTRAINT conversaciones_pkey PRIMARY KEY (id);


--
-- Name: formulario_campos formulario_campos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.formulario_campos
    ADD CONSTRAINT formulario_campos_pkey PRIMARY KEY (id);


--
-- Name: mensajes mensajes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mensajes
    ADD CONSTRAINT mensajes_pkey PRIMARY KEY (id);


--
-- Name: notificaciones notificaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notificaciones
    ADD CONSTRAINT notificaciones_pkey PRIMARY KEY (id);


--
-- Name: partes partes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.partes
    ADD CONSTRAINT partes_pkey PRIMARY KEY (id);


--
-- Name: programa_asignaciones programa_asignaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.programa_asignaciones
    ADD CONSTRAINT programa_asignaciones_pkey PRIMARY KEY (id);


--
-- Name: programa_links programa_links_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.programa_links
    ADD CONSTRAINT programa_links_pkey PRIMARY KEY (id);


--
-- Name: programa_partes programa_partes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.programa_partes
    ADD CONSTRAINT programa_partes_pkey PRIMARY KEY (id);


--
-- Name: programas programas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.programas
    ADD CONSTRAINT programas_pkey PRIMARY KEY (id);


--
-- Name: qr_asistencia qr_asistencia_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.qr_asistencia
    ADD CONSTRAINT qr_asistencia_pkey PRIMARY KEY (id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: tipos_asistencia tipos_asistencia_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tipos_asistencia
    ADD CONSTRAINT tipos_asistencia_pkey PRIMARY KEY (id);


--
-- Name: usuarios_partes usuarios_partes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios_partes
    ADD CONSTRAINT usuarios_partes_pkey PRIMARY KEY (id);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: usuarios_roles usuarios_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios_roles
    ADD CONSTRAINT usuarios_roles_pkey PRIMARY KEY (id);


--
-- Name: asistencias_telefono_registro_semana_inicio_tipo_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX asistencias_telefono_registro_semana_inicio_tipo_id_key ON public.asistencias USING btree (telefono_registro, semana_inicio, tipo_id);


--
-- Name: partes_nombre_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX partes_nombre_key ON public.partes USING btree (nombre);


--
-- Name: programa_partes_programa_id_parte_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX programa_partes_programa_id_parte_id_key ON public.programa_partes USING btree (programa_id, parte_id);


--
-- Name: programas_codigo_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX programas_codigo_key ON public.programas USING btree (codigo);


--
-- Name: programas_fecha_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX programas_fecha_key ON public.programas USING btree (fecha);


--
-- Name: qr_asistencia_codigo_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX qr_asistencia_codigo_key ON public.qr_asistencia USING btree (codigo);


--
-- Name: roles_nombre_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX roles_nombre_key ON public.roles USING btree (nombre);


--
-- Name: tipos_asistencia_nombre_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX tipos_asistencia_nombre_key ON public.tipos_asistencia USING btree (nombre);


--
-- Name: usuarios_codigo_pais_telefono_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX usuarios_codigo_pais_telefono_key ON public.usuarios USING btree (codigo_pais, telefono);


--
-- Name: usuarios_partes_usuario_id_parte_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX usuarios_partes_usuario_id_parte_id_key ON public.usuarios_partes USING btree (usuario_id, parte_id);


--
-- Name: usuarios_roles_usuario_id_rol_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX usuarios_roles_usuario_id_rol_id_key ON public.usuarios_roles USING btree (usuario_id, rol_id);


--
-- Name: asistencias asistencias_confirmado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asistencias
    ADD CONSTRAINT asistencias_confirmado_por_fkey FOREIGN KEY (confirmado_por) REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: asistencias asistencias_qr_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asistencias
    ADD CONSTRAINT asistencias_qr_id_fkey FOREIGN KEY (qr_id) REFERENCES public.qr_asistencia(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: asistencias asistencias_tipo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asistencias
    ADD CONSTRAINT asistencias_tipo_id_fkey FOREIGN KEY (tipo_id) REFERENCES public.tipos_asistencia(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: asistencias asistencias_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asistencias
    ADD CONSTRAINT asistencias_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: conversaciones conversaciones_programa_en_edicion_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversaciones
    ADD CONSTRAINT conversaciones_programa_en_edicion_fkey FOREIGN KEY (programa_en_edicion) REFERENCES public.programas(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: conversaciones conversaciones_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversaciones
    ADD CONSTRAINT conversaciones_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: formulario_campos formulario_campos_tipo_asistencia_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.formulario_campos
    ADD CONSTRAINT formulario_campos_tipo_asistencia_id_fkey FOREIGN KEY (tipo_asistencia_id) REFERENCES public.tipos_asistencia(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: mensajes mensajes_conversacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mensajes
    ADD CONSTRAINT mensajes_conversacion_id_fkey FOREIGN KEY (conversacion_id) REFERENCES public.conversaciones(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: notificaciones notificaciones_programa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notificaciones
    ADD CONSTRAINT notificaciones_programa_id_fkey FOREIGN KEY (programa_id) REFERENCES public.programas(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: notificaciones notificaciones_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notificaciones
    ADD CONSTRAINT notificaciones_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: programa_asignaciones programa_asignaciones_parte_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.programa_asignaciones
    ADD CONSTRAINT programa_asignaciones_parte_id_fkey FOREIGN KEY (parte_id) REFERENCES public.partes(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: programa_asignaciones programa_asignaciones_programa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.programa_asignaciones
    ADD CONSTRAINT programa_asignaciones_programa_id_fkey FOREIGN KEY (programa_id) REFERENCES public.programas(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: programa_asignaciones programa_asignaciones_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.programa_asignaciones
    ADD CONSTRAINT programa_asignaciones_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: programa_links programa_links_agregado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.programa_links
    ADD CONSTRAINT programa_links_agregado_por_fkey FOREIGN KEY (agregado_por) REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: programa_links programa_links_parte_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.programa_links
    ADD CONSTRAINT programa_links_parte_id_fkey FOREIGN KEY (parte_id) REFERENCES public.partes(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: programa_links programa_links_programa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.programa_links
    ADD CONSTRAINT programa_links_programa_id_fkey FOREIGN KEY (programa_id) REFERENCES public.programas(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: programa_partes programa_partes_parte_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.programa_partes
    ADD CONSTRAINT programa_partes_parte_id_fkey FOREIGN KEY (parte_id) REFERENCES public.partes(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: programa_partes programa_partes_programa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.programa_partes
    ADD CONSTRAINT programa_partes_programa_id_fkey FOREIGN KEY (programa_id) REFERENCES public.programas(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: programas programas_creado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.programas
    ADD CONSTRAINT programas_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: qr_asistencia qr_asistencia_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.qr_asistencia
    ADD CONSTRAINT qr_asistencia_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: qr_asistencia qr_asistencia_tipo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.qr_asistencia
    ADD CONSTRAINT qr_asistencia_tipo_id_fkey FOREIGN KEY (tipo_id) REFERENCES public.tipos_asistencia(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: usuarios_partes usuarios_partes_parte_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios_partes
    ADD CONSTRAINT usuarios_partes_parte_id_fkey FOREIGN KEY (parte_id) REFERENCES public.partes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: usuarios_partes usuarios_partes_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios_partes
    ADD CONSTRAINT usuarios_partes_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: usuarios_roles usuarios_roles_asignado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios_roles
    ADD CONSTRAINT usuarios_roles_asignado_por_fkey FOREIGN KEY (asignado_por) REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: usuarios_roles usuarios_roles_rol_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios_roles
    ADD CONSTRAINT usuarios_roles_rol_id_fkey FOREIGN KEY (rol_id) REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: usuarios_roles usuarios_roles_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios_roles
    ADD CONSTRAINT usuarios_roles_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict E4Csq2oFb0NAjUbj5HgNxrogjz8HjSPv7ysaEfD26qfOAZygE5rQkOvYo9RcFoz

