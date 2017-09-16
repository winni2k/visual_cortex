from io import StringIO

import attr
from flask import Flask, render_template, redirect
from flask_bootstrap import Bootstrap
from subprocess import check_output

from flask_wtf import FlaskForm
from wtforms import StringField, SubmitField
from wtforms.validators import DataRequired


def create_app():
    app = Flask(__name__)
    Bootstrap(app)

    return app


app = create_app()

CORTEXJDK_JAR = 'libs/CortexJDK/dist/cortexjdk.jar'
GRAPH = 'data/test.ctx'
app.config.from_object(__name__)


@attr.s
class Kmer(object):
    line = attr.ib()
    canonical_kmer = attr.ib(init=False)
    oriented_kmer = attr.ib(init=False)
    coverage = attr.ib(init=False)
    edge_split = attr.ib(init=False)

    def __attrs_post_init__(self):
        fields = self.line.strip().split()
        self.canonical_kmer, self.oriented_kmer, self.coverage, self.edge_split = tuple(fields[:4])


class MyForm(FlaskForm):
    name = StringField(validators=[DataRequired()])
    submit = SubmitField()


@app.route('/', methods=('GET', 'POST'))
def index():
    form = MyForm(csrf_enabled=False)
    if form.validate_on_submit():
        return redirect('/kmers/' + form.name.raw_data[0])
    return render_template('index.html', form=form)


def parse_cortexjdk_print(stream):
    kmers = []
    for line in stream:
        if line.startswith('I'):
            continue
        kmers.append(Kmer(line))
    return kmers


@app.route('/kmers/<kmer>')
def kmers_show(kmer):
    output = StringIO(
        check_output(['java', '-jar', CORTEXJDK_JAR, 'Print', '--graph', GRAPH, '--record',
                      kmer]).decode())
    kmers = parse_cortexjdk_print(output)
    return '\n'.join([str(k) for k in kmers])
